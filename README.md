<h1 style="margin: 30px 0 30px; font-weight: bold;">echarts-drill-down</h1>

### 项目简介

- 本项目提供了一个echarts下钻到市级区域的示例（精度到区县一级）
- 同时支持通过命令直接生成`中国边界线GeoGson文件`,`中国地图GeoJson文件（精度包含省、市、区县）`以及`按省份划分的省级GeoJson文件`、`市级GeoJson文件`，源文件来源于[`AntV L7 GISDATA`](https://l7.antv.antgroup.com/custom/tools/map)页面使用的`pdf`文件

### 项目缘由

主要用于离线场景下无法使用在线的`Json/GeoJson`数据，依赖于`pbf`文件快速生成全量的`GeoJson`文件（目前依赖的`pbf`文件仅支持到区县一级，有时间的话后续考虑支持乡镇一级）

### 启动

```javascript
*安装依赖
pnpm i
*启动项目
pnpm dev
```

### 抽取命令

```javascript
*执行以下命令 支持local和antv两种模式
pnpm make:geojson [mode]

### 参数说明
* local 模式：依赖项目根目录/public/pbf目录下的pbf文件生成最终的GeoJson文件
* antv 模式：如果antv使用的CDN资源有更新，你可以使用此模式拉取最新的pbf文件来生成最终的GeoJson文件
```

### 文件说明

```javascript
echarts-drill-down    
                 |-public                            
                 |   |-pbf                           # tinymce 编辑器静态资源
                 |   |-boundary                      # 存储antv页面使用的中国边界GeoJson文件
                 |   |-geojson
                 |   |   |-china.geojson             # 中国边界线geojson
                 |   |   |-china-province.geojson    # 中国地图geojson，精度到省级
                 |   |   |-china-city.geojson        # 中国地图geojson，精度到市级
                 |   |   |-china-county.geojson      # 中国地图geojson，精度到区县级
                 |   |   |-provinces                 # 拆分提取的geojson数据
                 |   |             |-文件                 # 名称或code对应省份的geojson数据，精度到市
                 |   |             |-目录                 # 名称或code对应省份下市级的geojson数据，精度到区县
                 |   |-favicon.ico                   # favicon 图标
```

### 其他

- 建议使用pnpm作为包管理工具
- 建议node ≥ 18.20，否则`make:geojson`命令不可用，原因参考 [issue](https://github.com/evanw/esbuild/issues/3778)
