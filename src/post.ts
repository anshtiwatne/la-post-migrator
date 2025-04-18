import fs from "fs/promises"
import path from "path"
import puppeteer, { Page } from "puppeteer"

const postsDir = path.join(__dirname, "../posts")

interface PostData {
	filePath: string
	post: {
		date: string
		title: string
		content: string
	}
}

async function getPosts() {
	const postFiles = await fs.readdir(postsDir)
	const posts: PostData[] = []

	for (const postFile of postFiles) {
		const filePath = path.join(postsDir, postFile)
		const post = JSON.parse(await fs.readFile(filePath, "utf-8"))
		posts.push({ filePath, post })
	}

	posts.sort(
		(a, b) =>
			new Date(a.post.date).getTime() - new Date(b.post.date).getTime()
	)

	return posts
}

async function populatePost(page: Page, post) {
	await page.locator('[aria-label="Add title"]').fill(post.title)

	await page.focus(".block-editor-default-block-appender__content")
	await page.evaluate((content) => {
		return navigator.clipboard.writeText(content)
	}, post.content)

	await page.keyboard.down("Control")
	await page.keyboard.press("V")
	await page.keyboard.up("Control")

	await new Promise((resolve) => setTimeout(resolve, 1000))
}

async function main() {
	const browser = await puppeteer.launch()
	const page = await browser.newPage()
	const posts = await getPosts()

	for (const { post } of posts) {
		await page.goto("https://www.livingacademy.org/wp-admin/post-new.php")
		await populatePost(page, post)

		await page.locator(".editor-post-publish-button__button").click()
		await page.locator(".editor-post-publish-panel").wait()
		await page.locator(".editor-post-publish-button__button").click()

		await page.locator(".components-snackbar__content").wait()
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}

	await browser.close()
}

main()
