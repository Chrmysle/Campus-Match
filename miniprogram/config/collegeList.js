// config/collegeList.js — 北航学院列表（用于注册和个人主页编辑）
// 按学科群分类，实际使用时以扁平列表形式供 picker 选择

const COLLEGE_LIST = {
  // 学科群分组（仅用于组织和展示）
  groups: [
    {
      group: '航空航天学科群',
      colleges: [
        '材料科学与工程学院',
        '可靠性与系统工程学院',
        '能源与动力工程学院',
        '宇航学院',
        '航空科学与工程学院',
        '飞行学院',
        '机械工程及自动化学院',
        '无人系统研究院',
        '交通科学与工程学院',
        '航空发动机研究院'
      ]
    },
    {
      group: '信息学科群',
      colleges: [
        '电子信息工程学院',
        '软件学院',
        '自动化科学与电气工程学院',
        '网络空间安全学院',
        '计算机学院',
        '集成电路科学与工程学院',
        '仪器科学与光电工程学院',
        '人工智能学院'
      ]
    },
    {
      group: '理科学科群',
      colleges: [
        '数学科学学院',
        '化学学院',
        '物理学院',
        '空间与地球科学学院'
      ]
    },
    {
      group: '文科学科群',
      colleges: [
        '经济管理学院',
        '新媒体艺术与设计学院',
        '人文社会科学学院',
        '马克思主义学院',
        '外国语学院',
        '人文与社会科学高等研究院',
        '法学院'
      ]
    },
    {
      group: '医工交叉学科群',
      colleges: [
        '生物与医学工程学院',
        '医学科学与工程学院'
      ]
    },
    {
      group: '融合创新示范区',
      colleges: [
        '北航学院',
        '国际学院',
        '沈元学院',
        '高等理工学院/未来空天技术学院/国家卓越工程师学院/量子科技学院',
        '北京学院',
        '中法工程师学院 / 国际通用工程学院',
        '体育部',
        '国际创新学院',
        '中法航空学院 / 中法未来科技学院 / 中西智能学院',
        '继续教育学院',
        '国际前沿交叉科学研究院'
      ]
    }
  ],

  // 扁平列表（供 picker 使用）
  getFlatList: function () {
    var list = [];
    this.groups.forEach(function (g) {
      g.colleges.forEach(function (c) { list.push(c); });
    });
    return list;
  }
};

// 年级选项（本硕博全年级）
const GRADE_OPTIONS = [
  { value: 1, label: '大一' },
  { value: 2, label: '大二' },
  { value: 3, label: '大三' },
  { value: 4, label: '大四' },
  { value: 5, label: '研一' },
  { value: 6, label: '研二' },
  { value: 7, label: '研三' },
  { value: 8, label: '博士' }
];

// 获取年级标签
function getGradeLabel(value) {
  var option = GRADE_OPTIONS.find(function (o) { return o.value === value; });
  return option ? option.label : '未设置';
}

module.exports = { COLLEGE_LIST, GRADE_OPTIONS, getGradeLabel };