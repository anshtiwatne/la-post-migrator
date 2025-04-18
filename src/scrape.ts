import fs from "fs"
import path from "path"
import puppeteer from "puppeteer"

const postsDir = path.join(__dirname, "../posts")
if (!fs.existsSync(postsDir)) {
	fs.mkdirSync(postsDir, { recursive: true })
}

function sanitizeFilename(name: string): string {
	return name.replace(/[\/\\?%*:|"<>]/g, "-")
}

function sanitizeDate(date: string): Date {
	return new Date(date)
}

function unwrapImgAnchors(html: string): string {
	return html.replace(/<a\b[^>]*>\s*(<img\b[^>]*>).*?<\/a>/gi, "$1")
}

function savePost(
	title: string,
	author: string,
	date: string,
	postHTML: string
) {
	console.log(title)

	const postData = {
		title: title,
		author: author,
		date: sanitizeDate(date),
		content: unwrapImgAnchors(postHTML),
	}

	const jsonContent = JSON.stringify(postData, null, "\t")
	const fileName = path.join(postsDir, `${sanitizeFilename(title)}.json`)

	fs.writeFileSync(fileName, jsonContent, "utf8")
}

async function main() {
	const browser = await puppeteer.launch({headless: false})
	const page = await browser.newPage()

	await page.goto("https://metastudio.org/c/la/88")
	await page.locator(".topic-list-body").wait()

	const postElements = await page.$$("a.raw-topic-link")
	for (const element of postElements) {
		const postLink = await page.evaluate((el) => el.href, element)

		const postPage = await browser.newPage()
		await postPage.goto(postLink)

		const postHTML = await postPage.$eval(
			"div.cooked",
			(el) => el.innerHTML
		)
		const title =
			(await postPage.$eval("a.fancy-title", (el) =>
				el.textContent?.trim()
			)) || ""
		const author =
			(await postPage.$eval("span.full-name a", (el) =>
				el.textContent?.trim()
			)) || ""
		const date =
			(await postPage.$eval("span.relative-date", (el) =>
				el.getAttribute("title")
			)) || ""
		await postPage.close()

		savePost(title, author, date, postHTML)
	}

	await browser.close()
}

main()
