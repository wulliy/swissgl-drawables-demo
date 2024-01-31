// wuilly
// 1/27/2024

/*
	Copyright 2024 wuilly

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

	    http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

const canvas = document.querySelector("#c")
const glsl = SwissGL(canvas)

class Textures extends EventTarget {
	constructor() {
		super()
		this.textures = {}
	}

	generate_texture(src, drawable) {
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
			
				this.textures[src] = tex
				this.dispatchEvent(new CustomEvent("new_texture", {
					detail: {
						drawable: drawable,
						texture: tex
					}
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

	add_texture(src, drawable) {
		if (!(src in this.textures)) this.generate_texture(src, drawable)
	}

	get_texture(src) {
		return this.textures[src]
	}
}

class Drawables {
	constructor() {
		this.drawables = []
		this._textures = new Textures()
		this._textures.addEventListener("new_texture", ev => {
			const detail = ev.detail
			detail.drawable.set_texture(detail.texture)
		})
	}

	add_drawable(drawable) {
		this.drawables.push(drawable)
			
		const src = drawable.src
		const tex = this._textures.get_texture(src)
		if (!tex) {
			this._textures.add_texture(src, drawable)
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

	const srcs = ["img/Dot-a.svg", "img/Dot-b.svg", "img/Dot-c.svg", "img/Dot-d.svg"] // :3.
	for (let i = 0; i < 1000; i++) {
		drawables.add_drawable(new Drawable({src: srcs[Math.floor(Math.random() * srcs.length)]}))
	}

	const all_drawables = drawables.drawables
	glsl.loop(({time}) => {
		glsl.adjustCanvas()

		for (const i in all_drawables) {
			const drawable = all_drawables[i]
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

			drawable.position[0] = Math.cos(time-i+1) * (0.05*i+1)
			drawable.position[1] = Math.sin(time-i+1) * (0.05*i+1)
		}
	})
}

window.addEventListener("load", main)