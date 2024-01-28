// wuilly
// 1/27/2024

const canvas = document.querySelector("#c")
const glsl = SwissGL(canvas)

class Textures extends EventTarget {
	constructor() {
		super()
		this.textures = new Map()
	}

	generate_texture(src) {
		const img = document.createElement("img")
		img.crossOrigin = "anonymous"
		img.addEventListener("load", () => {
			const width = img.width
			const height = img.height
			createImageBitmap(img, 0, 0, width, height).then(bitmap => {
				const tex = glsl({}, {
					tag: src,
					data: bitmap,
					size: [width, height],
					filter: "linear",
					format: "rgba8"
				})

				// see: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/transferToImageBitmap#return_value
				bitmap.close()
			
				this.textures.set(src, tex)
				this.dispatchEvent(new CustomEvent("new_texture", {
					detail: tex
				}))
			}).catch(err => {
				if (err) console.error(`failed to create image ("${src}") bitmap: ${err}`)
			})
		}, {once: true})

		img.addEventListener("error", err => {
			if (err) console.error(`failed to create image ("${src}"): ${err}`)
		})

		img.src = src
	}

	add_texture(src) {
		if (!this.textures.has(src)) this.generate_texture(src)
	}

	get_texture(src) {
		return this.textures.get(src)
	}
}

class Drawables {
	constructor() {
		this._textures = new Textures()
		this.drawables = []
	}

	add_drawable(drawable) {
		this.drawables.push(drawable)
			
		const src = drawable.src
		const tex = this._textures.get_texture(src)
		if (!tex) {
			this._textures.add_texture(src)
			this._textures.addEventListener("new_texture", (ev) => {
				drawable.set_texture(ev.detail)
			})
		} else {
			drawable.set_texture(tex)
		}
	}
}

class Drawable {
	constructor(options) {
		options = options || {}
		this.src = options.src
		this.position = options.position ? Object.values(options.position) : [0, 0]
		this.ready = false
		this.size = [0, 0]
		this.tex = null
	}

	set_texture(tex) {
		if (tex._tag === this.src) {
			this.tex = tex
			this.size = this.tex.size
			this.ready = true
		}
	}
}

function main() {
	const drawables = new Drawables()
	window.drawables = drawables

	const srcs = ["img/Dot-a.svg", "img/Dot-b.svg", "img/Dot-c.svg", "img/Dot-d.svg"] // :3
	for (let i = 0; i < 50; i++) {
		drawables.add_drawable(new Drawable({src: srcs[Math.floor(Math.random() * srcs.length)]}))
	}

	glsl.loop(({time}) => {
		glsl.adjustCanvas()

		const all_drawables = drawables.drawables
		for (const idx in all_drawables) {
			const drawable = all_drawables[idx]
			if (!drawable.ready) continue

			// TODO: is it possible to make efficient use of instancing here...?
			// `Grid: [10, 10]`
			glsl({
				tex: drawable.tex,
				position: drawable.position,
				Aspect: "fit",
				Blend: "d*(1-sa)+s*sa",
				Grid: [1, 1],
				VP: `VPos.xy = (XY + vec2(position.x, -position.y)) * (0.5-0.5/vec2(Mesh+1));`,
				FP: `texture(tex, vec2(UV.x, -UV.y))`
			})

			drawable.position[0] = Math.cos(time-idx+1) * (0.15*idx+1)
			drawable.position[1] = Math.sin(time-idx+1) * (0.15*idx+1)
		}
	})
}

window.addEventListener("load", main)