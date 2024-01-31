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
	constructor(auto_set_texture) {
		super()
		this.textures = {}
		this.auto_set_texture = auto_set_texture || false
	}

	generate_texture(src, drawable) {
		const img = new Image()
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
				if (this.auto_set_texture) drawable.set_texture(tex)
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
		this._textures = new Textures(true)
		this.drawables = []
	}

	add_drawable(drawable) {
		this.drawables.push(drawable)
		const src = drawable.src
		const tex = this._textures.get_texture(src)
		if (!tex) {
			this._textures.add_texture(src, drawable)
			return
		}
		drawable.set_texture(tex)
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
	const Blend = "d*(1-sa)+s*sa"
	const VP = `VPos.xy = (XY + vec2(position.x, -position.y)) * (0.5-0.5/vec2(Mesh+1));`
	const FP = `texture(tex, vec2(UV.x, -UV.y))`
	const [cos, sin, random] = [Math.cos, Math.sin, Math.random]

	const drawables = new Drawables()
	window.drawables = drawables

	const srcs = ["img/Dot-a.svg", "img/Dot-b.svg", "img/Dot-c.svg", "img/Dot-d.svg"] // :3.
	for (let i = 0; i < 1000; i++) {
		drawables.add_drawable(new Drawable({src: srcs[(random() * 4)|0]}))
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
				Blend,
				VP,
				FP
			})

			drawable.position[0] = cos(time-i+1) * (0.05*i+1)
			drawable.position[1] = sin(time-i+1) * (0.05*i+1)
		}
	})
}

window.addEventListener("load", main)