/* ============================================================
 * cristi-portfolio · data.js
 * 数据层：作品 / 技能。挂载到 window.PF 命名空间。
 * 经典 script 引入（data.js → effects.js → main.js），禁止 ES module。
 * ============================================================ */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  /* ---------------- 作品（12 件：6 摄影 + 6 设计） ----------------
   * 字段：id / cat("photo"|"design") / title / titleEn / year /
   *       tags / img / palette（卡片强调色） / desc（hover 遮罩文案）
   */
  PF.WORKS = [
    {
      id: 'w01', cat: 'photo',
      title: '霓裳之夜', titleEn: 'NEON CITY NIGHTS', year: 2025,
      tags: ['时装', '夜景', '胶片'],
      img: 'assets/img/photo-01.jpg', palette: '#ff2e88',
      desc: '城市霓虹下的高定时装大片，以胶片颗粒还原夜晚的迷离质感。'
    },
    {
      id: 'w02', cat: 'photo',
      title: '都市独白', titleEn: 'URBAN SOLILOQUY', year: 2025,
      tags: ['街头', '黑白', '情绪'],
      img: 'assets/img/photo-02.jpg', palette: '#8e8e93',
      desc: '黑白街头系列，用硬光与阴影讲述都市人的内心独白。'
    },
    {
      id: 'w03', cat: 'photo',
      title: '织梦者', titleEn: 'DREAMWEAVER', year: 2024,
      tags: ['概念', '棚拍', '色彩'],
      img: 'assets/img/photo-03.jpg', palette: '#7c4dff',
      desc: '棚内概念大片，流动的纱幔与高饱和色彩编织出一场梦境。'
    },
    {
      id: 'w04', cat: 'photo',
      title: '棱镜回响', titleEn: 'PRISM ECHO', year: 2024,
      tags: ['实验', '光影', '妆容'],
      img: 'assets/img/photo-04.jpg', palette: '#00c2ff',
      desc: '棱镜折射实验系列，探索光影在面部妆容上的二次创作。'
    },
    {
      id: 'w05', cat: 'photo',
      title: '晨雾时装', titleEn: 'MORNING MIST', year: 2023,
      tags: ['外景', '自然光', '高级感'],
      img: 'assets/img/photo-05.svg', palette: '#9db8a4',
      desc: '清晨薄雾中的外景时装，自然光下的克制与高级感。'
    },
    {
      id: 'w06', cat: 'photo',
      title: '高定剪影', titleEn: 'HAUTE SILHOUETTE', year: 2023,
      tags: ['剪影', '极简', '轮廓'],
      img: 'assets/img/photo-06.svg', palette: '#1c1c1e',
      desc: '极简剪影系列，以轮廓线条致敬高定时装的建筑感。'
    },
    {
      id: 'w07', cat: 'design',
      title: '潮牌视觉系统', titleEn: 'STREET BRAND IDENTITY', year: 2025,
      tags: ['品牌', 'VI', '潮牌'],
      img: 'assets/img/design-01.svg', palette: '#ff5c00',
      desc: '街头潮牌完整视觉系统：Logo、辅助图形与全套应用延展。'
    },
    {
      id: 'w08', cat: 'design',
      title: '杂志封面设计', titleEn: 'EDITORIAL COVERS', year: 2025,
      tags: ['杂志', '排版', '封面'],
      img: 'assets/img/design-02.svg', palette: '#d4af37',
      desc: '时尚杂志封面系列，大胆的网格排版与字体对比。'
    },
    {
      id: 'w09', cat: 'design',
      title: '音乐节海报', titleEn: 'FESTIVAL POSTERS', year: 2024,
      tags: ['海报', '音乐节', '插画'],
      img: 'assets/img/design-03.svg', palette: '#00e676',
      desc: '电子音乐节主视觉海报，迷幻色彩与故障艺术的碰撞。'
    },
    {
      id: 'w10', cat: 'design',
      title: '排印实验', titleEn: 'TYPE EXPERIMENTS', year: 2024,
      tags: ['字体', '实验', '排印'],
      img: 'assets/img/design-04.svg', palette: '#ff3d71',
      desc: '中文排印实验，以解构字形探索文字的视觉张力。'
    },
    {
      id: 'w11', cat: 'design',
      title: '展览视觉', titleEn: 'EXHIBITION VISUAL', year: 2023,
      tags: ['展览', '主视觉', '空间'],
      img: 'assets/img/design-05.svg', palette: '#5e81f4',
      desc: '摄影展主视觉与空间导视系统设计。'
    },
    {
      id: 'w12', cat: 'design',
      title: '包装设计', titleEn: 'PACKAGING DESIGN', year: 2023,
      tags: ['包装', '香氛', '极简'],
      img: 'assets/img/design-06.svg', palette: '#b08d57',
      desc: '小众香氛品牌包装设计，极简主义下的材质实验。'
    }
  ];

  /* ---------------- 技能（百分比 0-100） ---------------- */
  PF.SKILLS = [
    { id: 'k1', name: '时装摄影', level: 95 },
    { id: 'k2', name: '商业修图', level: 92 },
    { id: 'k3', name: '品牌视觉设计', level: 88 },
    { id: 'k4', name: '海报排印', level: 85 },
    { id: 'k5', name: '前端开发 HTML / CSS / JS', level: 82 },
    { id: 'k6', name: '动态影像剪辑', level: 78 }
  ];

})();
