export interface MapInfoType {
  mapName: string
  mapNameCN: string
  mapData: mapDataType[]
}

export interface areaDataType {
  code: string
  name: string
  province: string
  provinceCode?: string
  city?: string
  children?: areaDataType[]
  area?: string
  value?: number
}

export interface areaType {
  [key: string]: areaDataType
}

export interface mapDataType extends areaDataType {
  value: number
}
