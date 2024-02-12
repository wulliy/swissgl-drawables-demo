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

const texture_props = {ready: true}
function create_texture(ready, img, src) {
	if (!ready) {
		return glsl({}, {
			tag: src,
			size: [0, 0],
			filter: "linear",
			format: "rgba8"
		})
	} else {
		return Object.assign(glsl({}, {
			tag: src,
			data: img,
			size: [img.width, img.height]
		}), texture_props)
	}
}

class Texture {
	constructor(_textures) { 
		this._textures = _textures
	}

	set(src) {
		if (src in this._textures) return this.texture = this._textures[src]
		const img = new Image()
		this.texture = create_texture(false, null, src)
		this._textures[src] = this.texture
		img.addEventListener("load", () => create_texture(true, img, src))
		img.addEventListener("error", err => console.error(`failed to create image ("${src}"): ${err}`))
		img.src = src
	}
}

class Drawables {
	constructor() {
		this._textures = {}
		this.drawables = []
	}

	add(drawable) {
		this.drawables.push(drawable)
		drawable.texture = new Texture(this._textures)
		drawable.texture.set(drawable.src)
	}
}

class Drawable {
	constructor(options) {
		options = options || {}
		this.src = options.src
		this.position = options.position ? Object.values(options.position) : [0, 0]
		// this.ready = false
		// this.size = [0, 0]
	}
}

function main() {
	const Blend = "d*(1-sa)+s*sa"
	const VP = `VPos.xy = (XY + vec2(position.x, position.y)) * (0.5-0.5/vec2(Mesh+1));`
	const FP = `texture(tex, vec2(UV.x, -UV.y))`
	const [cos, sin, random] = [Math.cos, Math.sin, Math.random]

	const drawables = new Drawables()
	window.drawables = drawables

	const srcs = ["img/Dot-a.svg", "img/Dot-b.svg", "img/Dot-c.svg", "img/Dot-d.svg"] // :3
	for (let i = 0; i < 1000; i++) {
		drawables.add(new Drawable({
			src: srcs[(random() * 4)|0]
		}))
	}

	const all_drawables = drawables.drawables
	glsl.loop(({time}) => {
		glsl.adjustCanvas()

		for (const i in all_drawables) {
			const drawable = all_drawables[i]
			const tex = drawable.texture.texture
			if (!tex.ready) continue

			// TODO: is it possible to make efficient use of instancing here...?
			// `Grid: [10, 10]`
			glsl({
				tex,
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