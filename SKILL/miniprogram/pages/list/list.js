const util = require('../../utils/util.js')
const db = require('../../utils/db.js')

const PREDEFINED_TAGS = [
  { id: 'jiahuo', name: '#加活', icon: '💼' },
  { id: 'shuaiguo', name: '#甩锅', icon: '🥘' },
  { id: 'jiaban', name: '#加班', icon: '🌙' },
  { id: 'wuli', name: '#顾客无理', icon: '😤' },
  { id: 'daigang', name: '#代岗', icon: '🔄' }
]

Page({
  data: {
    tasks: [],
    groupedTasks: {},
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    
    // 筛选条件
    filterStatus: null,
    filterTags: [],
    filterHasEvidence: false,
    filterDateRange: null,
    
    // 多选模式
    isMultiSelect: false,
    selectedTasks: [],
    
    // 标签列表
    allTags: PREDEFINED_TAGS,
    showFilterPanel: false
  },

  onLoad() {
    this.loadTasks()
  },

  onShow() {
    this.loadTasks()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, tasks: [] })
    this.loadTasks().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadTasks()
    }
  },

  // 加载任务列表
  async loadTasks() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const options = {
        page: this.data.page,
        pageSize: this.data.pageSize
      }
      
      if (this.data.filterStatus !== null) {
        options.status = this.data.filterStatus
      }
      
      if (this.data.filterTags.length > 0) {
        options.tags = this.data.filterTags
      }
      
      if (this.data.filterHasEvidence) {
        options.hasEvidence = true
      }
      
      if (this.data.filterDateRange) {
        options.startDate = this.data.filterDateRange.start
        options.endDate = this.data.filterDateRange.end
      }
      
      const tasks = await db.getTasks(options)
      
      // 处理任务数据
      const processedTasks = tasks.map(task => {
        const tagObj = PREDEFINED_TAGS.find(t => task.tags.includes(t.name))
        return {
          ...task,
          tagIcon: tagObj ? tagObj.icon : '📝',
          shortContent: task.content.length > 20 
            ? task.content.substring(0, 20) + '...' 
            : task.content,
          displayTags: task.tags.slice(0, 2),
          hasImages: task.images && task.images.length > 0,
          hasAudio: !!task.audio
        }
      })
      
      // 按日期分组
      const allTasks = this.data.page === 1 ? processedTasks : [...this.data.tasks, ...processedTasks]
      const grouped = this.groupTasksByDate(allTasks)
      
      this.setData({
        tasks: allTasks,
        groupedTasks: grouped,
        page: this.data.page + 1,
        hasMore: tasks.length === this.data.pageSize,
        loading: false
      })
      
    } catch (err) {
      console.error('加载失败', err)
      this.setData({ loading: false })
      util.showToast('加载失败')
    }
  },

  // 按日期分组
  groupTasksByDate(tasks) {
    const groups = {}
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    
    tasks.forEach(task => {
      const taskDate = new Date(task.createTime)
      const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate())
      
      let groupKey
      if (taskDay.getTime() === today.getTime()) {
        groupKey = '今天'
      } else if (taskDay.getTime() === yesterday.getTime()) {
        groupKey = '昨天'
      } else {
        groupKey = util.formatDate(taskDate, 'MM月DD日')
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(task)
    })
    
    return groups
  },

  // 显示筛选面板
  showFilter() {
    this.setData({ showFilterPanel: true })
  },

  // 关闭筛选面板
  closeFilter() {
    this.setData({ showFilterPanel: false })
  },

  // 选择状态筛选
  selectStatus(e) {
    const { status } = e.currentTarget.dataset
    this.setData({ 
      filterStatus: status === 'all' ? null : parseInt(status),
      page: 1,
      tasks: []
    })
    this.loadTasks()
    this.closeFilter()
  },

  // 切换标签筛选
  toggleTagFilter(e) {
    const { tag } = e.currentTarget.dataset
    const { filterTags } = this.data
    const index = filterTags.indexOf(tag.name)
    
    if (index > -1) {
      filterTags.splice(index, 1)
    } else {
      filterTags.push(tag.name)
    }
    
    this.setData({ 
      filterTags,
      page: 1,
      tasks: []
    })
    this.loadTasks()
  },

  // 切换证据筛选
  toggleEvidenceFilter() {
    this.setData({ 
      filterHasEvidence: !this.data.filterHasEvidence,
      page: 1,
      tasks: []
    })
    this.loadTasks()
    this.closeFilter()
  },

  // 清除筛选
  clearFilter() {
    this.setData({
      filterStatus: null,
      filterTags: [],
      filterHasEvidence: false,
      filterDateRange: null,
      page: 1,
      tasks: []
    })
    this.loadTasks()
    this.closeFilter()
  },

  // 进入多选模式
  enterMultiSelect(e) {
    const { id } = e.currentTarget.dataset
    this.setData({
      isMultiSelect: true,
      selectedTasks: [id]
    })
  },

  // 退出多选模式
  exitMultiSelect() {
    this.setData({
      isMultiSelect: false,
      selectedTasks: []
    })
  },

  // 切换选择
  toggleSelect(e) {
    const { id } = e.currentTarget.dataset
    const { selectedTasks } = this.data
    const index = selectedTasks.indexOf(id)
    
    if (index > -1) {
      selectedTasks.splice(index, 1)
    } else {
      selectedTasks.push(id)
    }
    
    this.setData({ selectedTasks })
  },

  // 批量完成
  async batchComplete() {
    if (this.data.selectedTasks.length === 0) {
      util.showToast('请先选择记录')
      return
    }
    
    const confirmed = await util.showModal('确认标记完成', `将标记 ${this.data.selectedTasks.length} 条记录为已完成`)
    if (!confirmed) return
    
    wx.showLoading({ title: '处理中...' })
    
    try {
      await db.batchComplete(this.data.selectedTasks)
      
      wx.hideLoading()
      util.showToast('操作成功', 'success')
      
      this.setData({
        isMultiSelect: false,
        selectedTasks: [],
        page: 1,
        tasks: []
      })
      this.loadTasks()
      
    } catch (err) {
      wx.hideLoading()
      util.showToast('操作失败')
    }
  },

  // 批量删除
  async batchDelete() {
    if (this.data.selectedTasks.length === 0) {
      util.showToast('请先选择记录')
      return
    }
    
    const confirmed = await util.showModal('确认删除', `将删除 ${this.data.selectedTasks.length} 条记录`)
    if (!confirmed) return
    
    wx.showLoading({ title: '删除中...' })
    
    try {
      await db.batchDelete(this.data.selectedTasks)
      
      wx.hideLoading()
      util.showToast('删除成功', 'success')
      
      this.setData({
        isMultiSelect: false,
        selectedTasks: [],
        page: 1,
        tasks: []
      })
      this.loadTasks()
      
    } catch (err) {
      wx.hideLoading()
      util.showToast('删除失败')
    }
  },

  // 标记完成
  async markComplete(e) {
    const { id } = e.currentTarget.dataset
    
    try {
      await db.updateTask(id, { status: 1 })
      util.showToast('已标记完成', 'success')
      
      // 更新本地数据
      const tasks = this.data.tasks.map(task => {
        if (task._id === id) {
          return { ...task, status: 1 }
        }
        return task
      })
      
      const grouped = this.groupTasksByDate(tasks)
      this.setData({ tasks, groupedTasks: grouped })
      
    } catch (err) {
      util.showToast('操作失败')
    }
  },

  // 删除记录
  async deleteTask(e) {
    const { id } = e.currentTarget.dataset
    
    const confirmed = await util.showModal('确认删除', '删除后可在30天内恢复')
    if (!confirmed) return
    
    try {
      await db.deleteTask(id)
      util.showToast('已删除', 'success')
      
      // 更新本地数据
      const tasks = this.data.tasks.filter(task => task._id !== id)
      const grouped = this.groupTasksByDate(tasks)
      this.setData({ tasks, groupedTasks: grouped })
      
    } catch (err) {
      util.showToast('删除失败')
    }
  },

  // 查看详情
  goToDetail(e) {
    if (this.data.isMultiSelect) return
    
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 阻止冒泡
  preventClose() {}
})
