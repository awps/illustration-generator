import type { FabricObject } from 'fabric'

export type LayerType = 'background' | 'illustration' | 'title' | 'text' | 'image'

export interface Layer {
  id: string
  type: LayerType
  name: string
  visible: boolean
  locked: boolean
}

// Module augmentation — add layer metadata to every FabricObject
declare module 'fabric' {
  interface FabricObject {
    layerId?: string
    layerType?: LayerType
    layerName?: string
  }
  interface SerializedObjectProps {
    layerId?: string
    layerType?: LayerType
    layerName?: string
  }
}

export function buildLayersFromCanvas(canvas: { getObjects(): FabricObject[] }): Layer[] {
  return canvas.getObjects()
    .filter((obj) => obj.layerId && obj.layerType)
    .map((obj) => ({
      id: obj.layerId!,
      type: obj.layerType!,
      name: obj.layerName ?? obj.layerType!,
      visible: obj.visible ?? true,
      locked: obj.layerType === 'background' ? true : !(obj.selectable ?? true),
    }))
}
