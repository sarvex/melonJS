/*!
 * melonJS Game Engine - v15.1.5
 * http://www.melonjs.org
 * melonjs is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 * @copyright (C) 2011 - 2023 Olivier Biot (AltByte Pte Ltd)
 */
import Vector2d from '../../../math/vector2.js';
import pool from '../../../system/pooling.js';
import TMXRenderer from './TMXRenderer.js';

/**
 * @classdesc
 * an Orthogonal Map Renderder
 * @augments TMXRenderer
 */
 class TMXOrthogonalRenderer extends TMXRenderer {
    /**
     * @param {TMXTileMap} map - the TMX map
     */
    constructor(map) {
        super(
            map.cols,
            map.rows,
            map.tilewidth,
            map.tileheight
        );
    }

    /**
     * return true if the renderer can render the specified layer
     * @ignore
     */
    canRender(layer) {
        return (
            (layer.orientation === "orthogonal") &&
            super.canRender(layer)
        );
    }

    /**
     * return the tile position corresponding to the specified pixel
     * @ignore
     */
    pixelToTileCoords(x, y, v) {
        let ret = v || new Vector2d();
        return ret.set(
            x / this.tilewidth,
            y / this.tileheight
        );
    }


    /**
     * return the pixel position corresponding of the specified tile
     * @ignore
     */
    tileToPixelCoords(x, y, v) {
        let ret = v || new Vector2d();
        return ret.set(
            x * this.tilewidth,
            y * this.tileheight
        );
    }

    /**
     * fix the position of Objects to match
     * the way Tiled places them
     * @ignore
     */
    adjustPosition(obj) {
        // only adjust position if obj.gid is defined
        if (typeof(obj.gid) === "number") {
            // Tiled objects origin point is "bottom-left" in Tiled,
            // "top-left" in melonJS)
            obj.y -= obj.height;
        }
    }

    /**
     * draw the tile map
     * @ignore
     */
    drawTile(renderer, x, y, tmxTile) {
        let tileset = tmxTile.tileset;
        // draw the tile
        tileset.drawTile(
            renderer,
            tileset.tileoffset.x + x * this.tilewidth,
            tileset.tileoffset.y + (y + 1) * this.tileheight - tileset.tileheight,
            tmxTile
        );
    }

    /**
     * draw the tile map
     * @ignore
     */
    drawTileLayer(renderer, layer, rect) {
        let incX = 1, incY = 1;

        // get top-left and bottom-right tile position
        let start = this.pixelToTileCoords(
            Math.max(rect.pos.x - (layer.maxTileSize.width - layer.tilewidth), 0),
            Math.max(rect.pos.y - (layer.maxTileSize.height - layer.tileheight), 0),
            pool.pull("Vector2d")
        ).floorSelf();

        let end = this.pixelToTileCoords(
            rect.pos.x + rect.width + this.tilewidth,
            rect.pos.y + rect.height + this.tileheight,
            pool.pull("Vector2d")
        ).ceilSelf();

        //ensure we are in the valid tile range
        end.x = end.x > this.cols ? this.cols : end.x;
        end.y = end.y > this.rows ? this.rows : end.y;

        switch (layer.renderorder) {
            case "right-up" :
                // swapping start.y and end.y
                end.y = start.y + (start.y = end.y) - end.y;
                incY = -1;
                break;
            case "left-down" :
                // swapping start.x and end.x
                end.x = start.x + (start.x = end.x) - end.x;
                incX = -1;
                break;
            case "left-up" :
                // swapping start.x and end.x
                end.x = start.x + (start.x = end.x) - end.x;
                // swapping start.y and end.y
                end.y = start.y + (start.y = end.y) - end.y;
                incX = -1;
                incY = -1;
                break;
        }

        // main drawing loop
        for (let y = start.y; y !== end.y; y+= incY) {
            for (let x = start.x; x !== end.x; x+= incX) {
                let tmxTile = layer.cellAt(x, y, false);
                if (tmxTile) {
                    this.drawTile(renderer, x, y, tmxTile);
                }
            }
        }

        pool.push(start);
        pool.push(end);
    }
}

export { TMXOrthogonalRenderer as default };
