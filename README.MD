# 娃娃收藏管理系统 - DollCollection

## 项目概述

这是一个专业的娃娃收藏管理系统，用于管理个人娃娃收藏、妆容记录、衣物配饰等。系统采用 React + Node.js + SQLite 技术栈开发，提供了完整的收藏品管理解决方案。

## 核心功能

### 1. 娃娃管理（DollsPage）
- **娃头管理**：记录娃头的基本信息、价格、尺寸、肤色等
- **娃体管理**：记录娃体的规格、尺寸、颈围、肩宽等
- **状态追踪**：支持"已到家"和"预订中"两种所有权状态
- **付款管理**：
  - 定金/全款支付状态管理
  - 尾款日期提醒（支持30天宽限期）
  - 逾期警告（3天内提醒、当日提醒、尾款期倒计时）
- **图片管理**：支持头像、相册图片的上传和位置调整
- **排序功能**：支持拖拽排序，自定义显示顺序
- **搜索功能**：全局搜索娃头、娃体信息

### 2. 妆容管理（MakeupPage）
- **妆师信息管理**：
  - 妆师基本信息（姓名、联系方式、专长、价格区间）
  - 开妆时间记录
  - 妆造规则图片上传
  - 下单模板保存
  - 收藏/心仪妆师标记
- **妆容状态管理**：
  - **当前妆容**：记录娃头当前的妆容信息
  - **妆容历史**：保存所有历史妆容记录
  - **约妆管理**：记录约妆信息和预计到货时间
  - **未妆偏好**：记录未化妆娃头的心仪妆师
  - **娃体妆容**：管理娃体的妆容信息
- **妆师排序**：支持拖拽排序，收藏妆师优先显示

### 3. 衣柜管理（WardrobePage）
- **分类管理**：
  - 身体配饰（body_accessories）
  - 头部配饰（headwear）
  - 套装（sets）
  - 单品（single_items）
  - 手持物（handheld）
- **商品信息**：
  - 品牌、购买平台、尺码记录
  - 价格管理（总价、定金、尾款）
  - 付款状态追踪
- **统计功能**：
  - 品牌统计（各品牌商品数量和金额）
  - 尺码统计（各尺码商品分布）
  - 状态统计（已到家/预订中）
- **搜索排序**：支持关键词搜索和拖拽排序

### 4. 个人中心（MyPage）
- **花费统计**：
  - 总花费统计
  - 分类花费（娃娃、妆容、衣物）
  - 各类占比分析
- **收藏概览**：
  - 收藏品总数
  - 各类别数量统计
- **趋势分析**：
  - 近6个月花费趋势图
  - 月度花费对比
- **付款提醒**：
  - 即将到期的尾款提醒
  - 一键跳转到对应管理页面

## 数据库结构

### 主要数据表

#### 1. makeup_artists（妆师表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 妆师名称 |
| contact | TEXT | 联系方式 |
| specialty | TEXT | 专长领域 |
| price_range | TEXT | 价格区间 |
| makeup_rules_image | TEXT | 妆造规则图片 |
| note_template | TEXT | 下单模板 |
| is_favorite | BOOLEAN | 是否收藏 |
| sort_order | INTEGER | 排序顺序 |
| when_available | TEXT | 开妆时间 |

#### 2. doll_heads（娃头表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 娃头名称 |
| company | TEXT | 生产公司 |
| skin_tone | TEXT | 肤色 |
| size | TEXT | 尺寸 |
| price | REAL | 价格 |
| profile_image_url | TEXT | 头像图片 |
| sort_order | INTEGER | 排序顺序 |
| original_price | REAL | 原价 |
| actual_price | REAL | 实际价格 |
| release_date | TEXT | 发售日期 |
| received_date | TEXT | 收货日期 |
| purchase_channel | TEXT | 购买渠道 |
| ownership_status | TEXT | 所有权状态(owned/preorder) |
| head_circumference | TEXT | 头围 |
| size_category | TEXT | 尺寸分类 |
| total_price | REAL | 总价 |
| deposit | REAL | 定金 |
| final_payment | REAL | 尾款 |
| final_payment_date | TEXT | 尾款日期 |
| payment_status | TEXT | 付款状态 |
| image_position_x/y | REAL | 图片位置 |
| image_scale | REAL | 图片缩放 |

#### 3. doll_bodies（娃体表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 娃体名称 |
| company | TEXT | 生产公司 |
| skin_tone | TEXT | 肤色 |
| size | TEXT | 尺寸 |
| neck_circumference | REAL | 颈围 |
| shoulder_width | REAL | 肩宽 |
| profile_image_url | TEXT | 头像图片 |
| (其他字段与娃头表类似) | | |

#### 4. head_makeup_history（娃头妆容历史表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| head_id | INTEGER | 娃头ID |
| makeup_artist_id | INTEGER | 妆师ID |
| makeup_artist_name | TEXT | 妆师名称 |
| makeup_fee | REAL | 妆费 |
| notes | TEXT | 备注 |
| makeup_date | DATETIME | 化妆日期 |
| removal_date | DATETIME | 卸妆日期 |
| image_url | TEXT | 妆容图片 |

#### 5. head_current_makeup（娃头当前妆容表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| head_id | INTEGER | 娃头ID（唯一） |
| makeup_artist_id | INTEGER | 妆师ID |
| makeup_artist_name | TEXT | 妆师名称 |
| makeup_fee | REAL | 妆费 |
| notes | TEXT | 备注 |
| makeup_date | DATETIME | 化妆日期 |
| image_url | TEXT | 妆容图片 |
| from_history_id | INTEGER | 来源历史ID |

#### 6. head_makeup_appointments（娃头约妆表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| head_id | INTEGER | 娃头ID（唯一） |
| makeup_artist_id | INTEGER | 妆师ID |
| makeup_artist_name | TEXT | 妆师名称 |
| makeup_fee | REAL | 妆费 |
| notes | TEXT | 备注 |
| expected_arrival | DATETIME | 预计到货时间 |

#### 7. head_unmade_preferences（未妆心仪妆师表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| head_id | INTEGER | 娃头ID |
| makeup_artist_id | INTEGER | 妆师ID |

#### 8. body_makeup（娃体妆容表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| body_id | INTEGER | 娃体ID（唯一） |
| makeup_artist_id | INTEGER | 妆师ID |
| makeup_artist_name | TEXT | 妆师名称 |
| makeup_fee | REAL | 妆费 |
| makeup_date | DATETIME | 化妆日期 |
| image_url | TEXT | 妆容图片 |

#### 9. wardrobe_items（衣柜物品表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 物品名称 |
| category | TEXT | 分类 |
| brand | TEXT | 品牌 |
| platform | TEXT | 购买平台 |
| ownership_status | TEXT | 所有权状态 |
| total_price | REAL | 总价 |
| deposit | REAL | 定金 |
| final_payment | REAL | 尾款 |
| final_payment_date | TEXT | 尾款日期 |
| payment_status | TEXT | 付款状态 |
| sizes | TEXT | 尺码 |
| is_overdue | BOOLEAN | 是否逾期 |
| profile_image_url | TEXT | 物品图片 |
| sort_order | INTEGER | 排序顺序 |

#### 10. photos（照片表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| entity_type | TEXT | 实体类型(head/body) |
| entity_id | INTEGER | 实体ID |
| photo_type | TEXT | 照片类型(profile/album/makeup) |
| image_url | TEXT | 图片URL |
| caption | TEXT | 图片说明 |
| is_cover | BOOLEAN | 是否封面 |
| image_position_x/y | REAL | 图片位置 |
| image_scale | REAL | 图片缩放 |

## API 接口

### 统计接口
- `GET /api/dolls/stats` - 获取娃娃统计信息
- `GET /api/stats/total-expenses` - 获取总花费统计
- `GET /api/stats/monthly-trend` - 获取月度趋势
- `GET /api/wardrobe/stats/brands` - 品牌统计
- `GET /api/wardrobe/stats/sizes` - 尺码统计
- `GET /api/wardrobe/stats/status` - 状态统计

### 娃娃管理接口
- `GET/POST/PUT/DELETE /api/doll-heads` - 娃头管理
- `GET/POST/PUT/DELETE /api/doll-bodies` - 娃体管理
- `PUT /api/doll-heads/:id/payment-status` - 更新付款状态
- `PUT /api/doll-heads/:id/confirm-arrival` - 确认到货
- `PUT /api/doll-heads/:id/image-position` - 更新图片位置
- `POST /api/sort/doll-heads` - 娃头排序

### 妆容管理接口
- `GET/POST/PUT/DELETE /api/makeup-artists` - 妆师管理
- `GET/POST/PUT/DELETE /api/makeup-history` - 妆容历史
- `GET/POST/DELETE /api/current-makeup` - 当前妆容
- `GET/POST/DELETE /api/makeup-appointment` - 约妆管理
- `GET/POST/DELETE /api/unmade-preferences` - 未妆偏好
- `GET/POST/PUT/DELETE /api/body-makeup` - 娃体妆容
- `POST /api/sort/makeup-artists` - 妆师排序

### 衣柜管理接口
- `GET /api/wardrobe/:category` - 获取分类物品
- `POST/PUT/DELETE /api/wardrobe` - 物品管理
- `PUT /api/wardrobe/:id/confirm-arrival` - 确认到货
- `PUT /api/wardrobe/:id/payment-status` - 更新付款状态
- `GET /api/wardrobe/search/:term` - 搜索物品
- `POST /api/sort/wardrobe/:category` - 物品排序

### 通用接口
- `POST /api/upload` - 图片上传
- `DELETE /api/upload/:filename` - 删除图片
- `GET/POST/PUT/DELETE /api/photos` - 照片管理
- `GET /api/dolls/search/:term` - 搜索娃娃

## 技术特点

### 前端特性
- **React Hooks**：使用 useState、useEffect 等进行状态管理
- **拖拽排序**：使用 @dnd-kit 实现拖拽排序功能
- **响应式设计**：适配移动端和桌面端
- **组件化架构**：高度模块化的组件设计
- **实时搜索**：支持防抖的实时搜索功能

### 后端特性
- **Express 框架**：RESTful API 设计
- **SQLite 数据库**：轻量级本地数据库
- **Multer 文件上传**：支持图片上传和管理
- **数据迁移**：自动检测并添加缺失字段
- **CORS 支持**：跨域资源共享

### 业务特性
- **状态管理系统**：统一的所有权和付款状态管理
- **智能提醒**：尾款到期提醒、逾期警告
- **宽限期机制**：30天尾款宽限期
- **批量操作**：支持批量更新排序
- **数据统计**：多维度数据分析和可视化

## 项目结构

```
DollCollection-master/
├── client/                 # 前端应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── DollsPage.js      # 娃娃管理页
│   │   │   ├── MakeupPage.js     # 妆容管理页
│   │   │   ├── WardrobePage.js   # 衣柜管理页
│   │   │   └── MyPage.js         # 个人中心页
│   │   ├── components/    # 功能组件
│   │   │   ├── BottomNav.js      # 底部导航
│   │   │   ├── ImageUpload.js    # 图片上传
│   │   │   ├── ImageViewer.js    # 图片查看器
│   │   │   ├── MakeupBook.js     # 妆容记录本
│   │   │   ├── CurrentMakeup.js  # 当前妆容
│   │   │   ├── MakeupHistory.js  # 妆容历史
│   │   │   ├── MakeupAppointment.js # 约妆管理
│   │   │   ├── UnmadeMakeup.js   # 未妆管理
│   │   │   ├── BodyMakeup.js     # 娃体妆容
│   │   │   ├── WardrobeCategory.js # 衣柜分类
│   │   │   ├── PhotoGallery.js   # 照片画廊
│   │   │   ├── PositionableImage.js # 可定位图片
│   │   │   └── CopyableText.js   # 可复制文本
│   │   └── App.js         # 主应用组件
│   └── package.json       # 前端依赖
├── server/                # 后端应用
│   ├── index.js          # 服务器主文件
│   ├── uploads/          # 上传文件目录
│   ├── doll_collection.db # SQLite数据库
│   └── package.json      # 后端依赖
└── package.json          # 项目根配置

```

## 启动指南

### 安装依赖
```bash
npm run install-all
```

### 开发模式
```bash
npm run dev
```
同时启动前端（端口3000）和后端（端口5000）

### 生产构建
```bash
npm run build
```

### 单独启动
```bash
npm run server  # 仅启动后端
npm run client  # 仅启动前端
```

## 使用说明

1. **初次使用**：系统会自动创建数据库和必要的表结构
2. **图片上传**：支持JPG、PNG等常见图片格式，自动生成唯一文件名
3. **数据备份**：建议定期备份 `doll_collection.db` 文件
4. **排序功能**：长按并拖动卡片可调整显示顺序
5. **搜索功能**：在搜索框输入关键词即可实时搜索
6. **状态切换**：点击相应按钮可切换付款状态和所有权状态

## 注意事项

- 图片文件存储在 `server/uploads` 目录
- 数据库文件位于 `server/doll_collection.db`
- 建议定期备份数据库和上传的图片文件
- 尾款日期设置后会自动计算提醒状态
- 删除妆师前请确保没有关联的妆容记录
