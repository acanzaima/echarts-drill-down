<h1 style="margin: 30px 0 30px; font-weight: bold;">echarts-drill-down</h1>

[预览地址](https://acanzaima.github.io/echarts-drill-down/)     

![项目截图.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9f4133839c1749bb97546bfbc35382f4~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=1855&h=977&s=97639&e=jpg&b=ffffff)

### 项目简介

- 本项目提供了一个echarts下钻到市级区域的示例（精度到区县一级）
- 同时支持通过命令直接生成`中国边界线GeoGson文件`,`中国地图GeoJson文件（精度包含省、市、区县）`以及`按省份（名称、code）划分的省级GeoJson文件`、`市级GeoJson文件`，源文件来源于[`AntV L7 GISDATA`](https://l7.antv.antgroup.com/custom/tools/map)页面使用的`pbf`文件
- 行政区划代码依赖[`province-city-china`](https://github.com/uiwjs/province-city-china)

### 项目缘
最近遇到一个需要离线地图下钻的场景，之前倒也是做过，不过只下钻到省一级，功能很简单。所以一开始遇到这个需求的时候一口应下，想着无非是`GeoJson`数据的问题。
调研了几个小时，没有完全符合需求又下载简单的数据，想了一下这个还算挺常见的需求，于是我打算写一个能拆分`PBF`文件的工具，然后想着既然拆分工具都写了直接再写个案例得了，所以才有了本项目。

目前只下钻到区县级，不过只要有`PBF`文件，微调抽取命令代码想精确到街道一级也是很快就能搞定的。
### 启动

```javascript
* 安装依赖
pnpm i
* 启动项目
pnpm dev
```

### 抽取命令

```javascript
* 执行以下命令 支持local和antv两种模式
pnpm make:geojson [mode]

### 参数说明
* local 模式：依赖项目根目录/public/pbf目录下的pbf文件生成最终的GeoJson文件
* antv 模式：如果antv使用的CDN资源有更新，你可以使用此模式拉取最新的pbf文件来生成最终的GeoJson文件
```

### 生成文件一览

名称和`code`命名的文件/目录各一份，省级（精度到市级）单文件34个，市级（精度到区县）文件按省划分为34个文件夹，总共136个文件和目录。

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1287a3829a1e46578ddccb4279d3a2f9~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=1432&h=741&s=94461&e=png&b=191919)

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
