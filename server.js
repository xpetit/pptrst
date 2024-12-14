import { argv } from "node:process"
import * as http from "node:http"
import * as url from "node:url"
import * as puppeteer from "puppeteer"
import assert from "node:assert"

const args = {
   timeout: 10, // in seconds, for webpages to load, /2 for clicks
   port: "8080",
}
const chromeArgs = ["--no-sandbox", "--disable-setuid-sandbox"]
for (const arg of argv.slice(2)) {
   if (!arg.startsWith("--")) throw Error(`Bad argument: "${arg}", should start with: "--"`)
   if (!arg) throw Error(`Empty argument: "${arg}"`)
   if (arg.startsWith("--chrome-")) {
      chromeArgs.push(arg.replace(/^--chrome-/, "--"))
   } else {
      const [k, v] = arg.slice(2).split("=")
      args[k] = v
   }
}

for (const key of Object.keys(args))
   switch (key) {
      case "port":
      case "window":
      case "timeout":
      case "binary-path":
         break
      default:
         throw Error(`Unknown option: "${key}"`)
   }

console.log("Running with args:")
for (const [k, v] of Object.entries(args))
   if (v) console.log(`  --${k}=${v}`)
   else console.log(`  --${k}`)
console.log("Running Chrome with args:")
for (const arg of chromeArgs) console.log(`  ${arg}`)

const isArgSet = (k) => {
   if (!(k in args)) return false
   const v = args[k]
   if (v === undefined) return true
   return v !== "false" || v !== "0"
}

const opts = {
   args: chromeArgs,
   defaultViewport: { width: 0, height: 0 },
   headless: !isArgSet("window"),
}
if (args["binary-path"]) opts.executablePath = args["binary-path"]
const browser = await puppeteer.launch(opts)

const [page] = await browser.pages()
page.setDefaultTimeout((args.timeout * 1000) / 2)
page.setDefaultNavigationTimeout(args.timeout * 1000)
page.on("pageerror", (err) => console.log("INFO: (page error)", err))
page.on("console", (message) => {
   const type = message.type()
   if (type === "warn" || type === "error") console.log(`INFO: (page ${type})`, message.text())
})

const getHandle = async (xpath) => {
   const nbShadowChildren = await page.evaluate(() => {
      document.shadowChildren = []
      let elems = [document.body]
      for (let depth = 0; depth < 1000 && elems.length > 0; depth++) {
         elems = elems.flatMap((e) =>
            [...e.children].filter((e) => {
               if (e.shadowRoot) {
                  document.shadowChildren.push(...[...e.shadowRoot.children].filter((e) => e.children.length > 0))
                  return false
               }
               return e.children.length > 0
            }),
         )
      }
      return document.shadowChildren.length
   })
   const shadowChildren = []
   for (let i = 0; i < nbShadowChildren; i++) {
      shadowChildren.push((await page.evaluateHandle(() => document.shadowChildren.shift())).asElement())
   }
   const handles = [
      (() =>
         page.waitForFunction(
            (xpath) => {
               const items = document.evaluate(xpath, document.body, null, XPathResult.ANY_TYPE, null)
               for (;;) {
                  const item = items.iterateNext()
                  if (!item) break
                  if (!item.checkVisibility()) continue
                  const { width, height } = item.getBoundingClientRect()
                  if (width && height) return item
               }
               return false
            },
            {},
            xpath.replaceAll("\n", ""),
         ))(),
      ...shadowChildren.map((h) => h.waitForSelector(xpathLocator)), // TODO: use the same mechanism to find handles
   ]
   return Promise.any(handles).catch(() => Promise.reject(Error(`"${xpath}" not found`)))
}

const getFieldHandle = (target) =>
   getHandle(`
      .//input[@id=//label[text()="${target}"]/@for] |
      .//input[@placeholder="${target}"] |
      .//textarea[@title="${target}"]
   `)

const lib = {
   close: () => {},

   goto: async (url) => {
      if (!url.startsWith("http")) url = `https://${url}`
      await page.goto(url, { waitUntil: ["load", "networkidle0"] })
      const actualURL = page.url()
      if (actualURL !== url) return { info: `"${url}" redirected to "${actualURL}"` }
      return {}
   },
   reload: async () => {
      const url = page.url()
      await page.reload({ waitUntil: ["load", "networkidle0"] })
      const actualURL = page.url()
      if (actualURL !== url) return { info: `"${url}" redirected to "${actualURL}"` }
      return {}
   },

   navigate: async (target) => {
      const waiter = page.waitForNavigation()
      await lib.click(target)
      await waiter
      return {}
   },
   click: async (target) => {
      if (!target) throw new Error(`Target is undefined: "${target}"`)
      const handle = await getHandle(`
         .//button[text()="${target}" or .//*[text()="${target}"]] |
         .//input[@type="submit" and @value="${target}"] |
         .//a[text()="${target}" or .//*[text()="${target}"]] |
         .//div[text()="${target}"] |
         .//*[@role="button"]//*[text()="${target}"]
      `).catch(() => Promise.reject(Error(`"${target}" not found`)))
      await handle.click()
      return {}
   },
   fill: async (target, text) => {
      const handle = await getFieldHandle(target).catch(() => Promise.reject(Error(`"${target}" not found`)))
      const value = await handle.evaluate((e) => e.value)
      if (value) throw Error(`"${target}" text field is not empty (has value: "${value}")`)
      await handle.type(text)
      return {}
   },

   press: async (key) => {
      await page.keyboard.press(key)
      return {}
   },

   dump: async () => ({
      body: await page.evaluate(() => {
         const bodyCopy = document.importNode(document.body, true)
         let deletedItems = false
         const filter = (children) => {
            for (const e of children) {
               let toDelete = false
               switch (e.tagName) {
                  case "NOSCRIPT":
                  case "SCRIPT":
                  case "STYLE":
                  case "svg":
                  case "TEMPLATE":
                     toDelete = true
                     break
                  case "SPAN":
                     if (!e.children.length && !e.textContent.trim()) toDelete = true
                     break
                  case "DIV":
                     if (!e.children.length) toDelete = true
                     break
               }
               if (toDelete) {
                  e.remove()
                  deletedItems = true
                  continue
               }
               for (const attr of [...e.attributes]) {
                  // Keep these attributes:
                  switch (attr.name) {
                     case "action":
                     case "for":
                     case "href":
                     // case "id":
                     case "method":
                     case "name":
                     case "role":
                     case "src":
                     case "target":
                     case "title":
                     case "type":
                     case "value":
                        continue
                  }
                  e.removeAttribute(attr.name)
               }
               filter([...e.children])
            }
         }
         // TODO: optimize
         for (;;) {
            deletedItems = false
            filter([...bodyCopy.children])
            if (!deletedItems) break
         }
         return bodyCopy.innerHTML
      }),
   }),
}

const funcNames = Object.keys(lib).sort((a, b) => (a < b ? -1 : 1))
const funcNamesWidth = funcNames.reduce((prev, v) => (v.length > prev ? v.length : prev), 0)
const funcArgs = Object.fromEntries(
   funcNames.map((name) => {
      const func = lib[name]
      const funcArgs = func
         .toString()
         .match(/\((.*?)\)/)?.[1]
         .split(", ")
         .filter(Boolean)
      assert(funcArgs.length === func.length) // making sure we parse the arguments from string correctly
      return [name, funcArgs]
   }),
)

const usage = () => {
   let s = "Usage:\n" + "PROC".padStart(funcNamesWidth) + " | PARAMS\n"
   s += "-".repeat(funcNamesWidth) + "-+-" + "-".repeat(funcNamesWidth) + "\n"
   for (const funcName of funcNames) s += funcName.padStart(funcNamesWidth) + " | " + funcArgs[funcName].join(", ") + "\n"
   return s + "-".repeat(funcNamesWidth) + "-+-" + "-".repeat(funcNamesWidth)
}

const newLocker = () => {
   let mutex = Promise.resolve()
   return () =>
      new Promise((resolve) => {
         mutex = mutex.then(() => new Promise(resolve))
      })
}
const locking = newLocker()
let expectedClose = false

const server = http.createServer(async (req, res) => {
   const unlock = await locking()
   try {
      const address = url.parse(req.url)
      const paths = address.pathname.split("/").filter(Boolean)
      if (!paths.length) throw Error(`Missing proc name. ${usage()}`)
      if (paths.length !== 1) throw Error(`Expected a single proc name, got: "${paths.join(`", "`)}". ${usage()}`)
      const funcName = paths[0]
      if (funcName === "close") {
         console.log("INFO: proc close()")
         res.end()
         server.close()
         server.closeAllConnections()
         expectedClose = true
         await browser.close()
         console.log("INFO: closed")
         return
      }
      const func = lib[funcName]
      if (!func) throw Error(`Unknown proc "${funcName}". ${usage()}`)
      const args = new URLSearchParams(address.query).getAll("arg")
      if (args.length !== func.length)
         throw Error(`Expected ${func.length} argument(s): (${funcArgs[funcName].join(", ")}), received ${args.length} argument(s): (${args.join(", ")})`)
      let info, body
      switch (func.length) {
         case 0: {
            console.log(`INFO: proc ${funcName}()`)
            ;({ info, body } = await func())
            break
         }
         case 1: {
            console.log(`INFO: proc ${funcName}("${args[0]}")`)
            ;({ info, body } = await func(args[0]))
            break
         }
         default: {
            console.log(`INFO: proc ${funcName}("${args.join(`", "`)}")`)
            ;({ info, body } = await func(...args))
         }
      }
      if (info) console.log(`INFO: ${info}`)
      if (body) res.end(body)
      else res.end()
   } catch (e) {
      const s = `ERROR: ${e.message}\n`
      process.stdout.write(s)
      res.writeHead(400, {
         "Content-Length": Buffer.byteLength(s),
         "Content-Type": "text/plain",
      }).end(s)
   } finally {
      unlock()
   }
})

page.on("close", async () => {
   if (expectedClose) return
   console.log("ERROR: page closed")
   server.close()
   server.closeAllConnections()
   await browser.close()
   process.exitCode = 1
})

server.listen(args.port)
