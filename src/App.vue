<script lang="ts" setup>
import {computed, ComputedRef, h, onMounted, reactive, ref} from 'vue'
import {message as antMessage, Modal, notification, TableProps} from "ant-design-vue";
import {Key, type TableRowSelection} from "ant-design-vue/es/table/interface";
import {cvs, InvalidCVSRootError, STATUS} from "./utils/cvs";
import TagStore from "./store/tag";
import {CompleteText, FileDetail, FileStatus, StatusInfo} from "./utils/bean";
import {CloseOutlined, PlusOutlined, ReloadOutlined} from '@ant-design/icons-vue';
import {checkFileExists, deleteFile, openFile, renameFile} from "./utils/file";
import TagHistoryItem from "./components/tag-history-item.vue";


const STATUS_INFO: { [key in FileStatus]: StatusInfo } = {
  [STATUS.UNKNOWN]: {text: '待提交', color: 'green', selectable: true},
  [STATUS.MODIFIED]: {text: '已修改', color: 'green', selectable: true},
  [STATUS.ADDED]: {text: '已添加', color: 'green', selectable: true},
  [STATUS.REMOVED]: {text: '已删除', color: 'green', selectable: true},
  [STATUS.CONFLICT]: {text: '冲突', color: 'green', selectable: true},
  [STATUS.UP_TO_DATE]: {text: '最新', color: 'blue', selectable: true},
  "not-cvs-file": {text: '非CVS文件', color: 'red', selectable: false},
  "not-found": {text: '文件不存在', color: 'red', selectable: false},
  "loading": {text: '加载中', color: 'pink', selectable: false},
  "error": {text: '错误', color: 'red', selectable: false},
};

const MESSAGE_KEY = 'message'

const message = ref<string>('')
const files = ref<FileDetail[]>([])
const tag = ref<string>('')

const tags = ref<string[]>([])
const tagCompletes: ComputedRef<CompleteText[]> = computed(() => {
  let tagCompletes = []
  const tagValue = tag.value
  for (let tag of tags.value) {
    if (!tagValue || tag.includes(tagValue)) {
      tagCompletes.push(new CompleteText(tag))
    }
  }
  return tagCompletes
});


const rowSelection: TableRowSelection<FileDetail> = reactive({
  selectedRowKeys: [],
  onChange: (selectedRowKeys: Key[], _: FileDetail[]) => {
    console.log('selectedRowKeys changed: ', selectedRowKeys);
    files.value.forEach(f => f.selected = selectedRowKeys.includes(f.path))
    rowSelection.selectedRowKeys = selectedRowKeys
  },
  getCheckboxProps: (record: FileDetail) => ({
    disabled: !STATUS_INFO[record.status as STATUS].selectable,
  }),
})

const [modal, contextHolder] = Modal.useModal();

onMounted(() => {
  const tagsLocal = TagStore.getTags()
  if (!tagsLocal.length) {
    return
  }
  tags.value = tagsLocal
  tag.value = tagsLocal.length ? tagsLocal[0] : ''
  files.value = TagStore.getTagFiles(tag.value)
  rowSelection.selectedRowKeys = files.value.filter(f => f.selected).map(f => f.path)
})

const columns: TableProps<FileDetail>['columns'] = [
  {
    title: '文件路径',
    dataIndex: 'path',
    key: 'path',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    width: 100
  },
]

const buttonState = reactive({
  commitLoading: false,
  historyLoading: false,
})

const updateStatus = async (file: FileDetail) => {
  //检查文件是否存在
  if (!await checkFileExists(file.path)) {
    file.status = 'not-found'
    file.selected = false
    return file
  }
  try {
    file.status = await cvs.getStatus(file.path)
    file.selected = STATUS_INFO[file.status as STATUS].selectable ? file.selected : false
  } catch (e: any) {
    console.error(e)
    if (e instanceof InvalidCVSRootError) {
      notification.error({
        message: `无效的CVS根目录`,
        description: e.message,
        duration: 2,
        placement: 'bottomRight'
      })
      file.status = 'not-cvs-file'
    } else {
      notification.error({
        message: `获取 ${file.name} 状态失败`,
        description: e.message,
        duration: 2,
        placement: 'bottomRight'
      })
      file.status = 'error'
    }
    file.selected = false
  }
  return file
};

const addFile = (file: File) => {
  if (files.value.find(f => f.path === file.path)) {
    return;
  }
  const detail = new FileDetail(file.name, file.path);
  files.value.push(detail);
  updateStatus(detail).then(() => {
    files.value = [...files.value];
  });
}

const cvsAddFile = async (file: FileDetail) => {
  antMessage.loading({content: `添加 ${file.name} 中...`, key: MESSAGE_KEY, duration: 0});
  await cvs.add(file.path)
}

const cvsCommitFile = async (file: FileDetail, message: string) => {
  antMessage.loading({content: `提交 ${file.name} 中...`, key: MESSAGE_KEY, duration: 0});
  await cvs.commit(file.path, message)
}

const cvsUpdateTag = async (file: FileDetail, tag: string) => {
  antMessage.loading({content: `更新 ${file.name} TAG中...`, key: MESSAGE_KEY, duration: 0});
  await cvs.updateTag(file.path, tag)
}

const cvsUpdate = async (file: FileDetail) => {
  antMessage.loading({content: `更新 ${file.name} 中...`, key: MESSAGE_KEY, duration: 0});
  await cvs.update(file.path)
}

const onTagSelect = (value: string) => {
  tag.value = value
};

const onTagHistoryCheck = (value: string) => {
  tag.value = value
  const filesValue = TagStore.getTagFiles(tag.value)
  if (filesValue.length) {
    files.value = filesValue
  }
};

const onTagHistoryDelete = (value: string) => {
  TagStore.removeTag(value)
  tags.value = TagStore.getTags()
};

const onFileDrop = (e: DragEvent) => {
  e.preventDefault()
  const eFiles = e.dataTransfer?.files
  if (eFiles && eFiles.length) {
    for (let i = 0; i < eFiles.length; i++) {
      addFile(eFiles[i])
    }
  }
}

const onFileDelete = (path: Key) => {
  const index = files.value.findIndex(f => f.path === path)
  if (index >= 0) {
    files.value.splice(index, 1)
  }
}

const onFileOpen = (path: string) => {
  openFile(path as string)
}

const onCommit = async () => {
  const filesValue = files.value
  const filesToCommit: FileDetail[] = filesValue.filter(f => f.selected)
  if (!filesToCommit.length) {
    antMessage.error('请选择文件')
    return
  }
  if (!tag.value) {
    antMessage.error('TAG不能为空')
    return
  }
  if (!/^[a-zA-Z]/.test(tag.value)) {
    antMessage.error('TAG必须以字母开头')
    return
  }
  buttonState.commitLoading = true
  const messageKey = MESSAGE_KEY;
  antMessage.loading({content: '提交中...', key: messageKey, duration: 0});
  console.log('commit file:', filesToCommit)
  console.log('commit message:', message.value)
  console.log('update tag:', tag.value)
  for (let file of filesToCommit) {
    console.log('committing', file.path)
    try {
      const status = await cvs.getStatus(file.path)
      if (status === cvs.STATUS.ADDED || status === cvs.STATUS.MODIFIED || status === cvs.STATUS.REMOVED) {
        await cvsCommitFile(file, message.value)
      } else if (status === cvs.STATUS.UNKNOWN) {
        await cvsAddFile(file)
        await cvsCommitFile(file, message.value)
      } else if (status === cvs.STATUS.CONFLICT) {
        await renameFile(file.path, file.path + '.bak')
        await cvsUpdate(file)
        await deleteFile(file.path)
        await renameFile(file.path + '.bak', file.path)
        await cvsCommitFile(file, message.value)
      }
    } catch (e: any) {
      console.error(e)
      notification.error({
        message: `提交 ${file.name} 失败`,
        description: e.message,
        duration: 2,
        placement: 'bottomRight'
      })
      continue
    }
    try {
      antMessage.loading({content: `更新 ${file.name} TAG中...`, key: messageKey, duration: 0});
      await cvs.updateTag(file.path, tag.value)
    } catch (e: any) {
      console.error(e)
      notification.error({
        message: `更新 ${file.name} TAG失败`,
        description: e.message,
        duration: 2,
        placement: 'bottomRight'
      })
      continue
    }
    await updateStatus(file)
  }

  antMessage.loading({content: '获取清单中...', key: messageKey, duration: 0});

  await showHistoryDialog(filesToCommit)

  console.log('commit done')

  let tagsValue = TagStore.addTag(tag.value)
  TagStore.setTagFiles(tag.value, filesValue)
  tags.value = tagsValue
  buttonState.commitLoading = false

  antMessage.success({content: '提交完成', key: messageKey, duration: 2});
}

const onHistory = async () => {
  const filesValue = files.value
  const filesToCommit = filesValue.filter(f => f.selected)
  if (!filesToCommit.length) {
    antMessage.error('请选择文件')
    return
  }
  buttonState.historyLoading = true
  const messageKey = 'history';
  antMessage.loading({content: '获取清单中...', key: messageKey, duration: 0});
  console.log('get history file:', filesToCommit)
  await showHistoryDialog(filesToCommit)
  antMessage.success({content: '获取清单完成', key: messageKey, duration: 2});
  console.log('get history done')
  buttonState.historyLoading = false
}

const showHistoryDialog = async (files: FileDetail[]) => {
  let historyStr = ''
  for (let file of files) {
    historyStr += await cvs.getHistory(file.path) + '\n'
  }
  modal.info({
    title: '提交清单',
    content: h('pre', historyStr),
    width: '90%',
    okText: '好的',
  });
}

const reloadFileList = async () => {
  files.value = files.value.map(f => {
    f.status = 'loading'
    return f
  })
  antMessage.loading({content: '文件状态刷新中...', key: 'reload', duration: 0});
  for (let file of files.value) {
    await updateStatus(file)
  }
  files.value = [...files.value]
  antMessage.success({content: '文件状态刷新完成', key: 'reload', duration: 2});
  TagStore.setTagFiles(tag.value, files.value)
}

const onAddFile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files) {
      for (let i = 0; i < target.files.length; i++) {
        addFile(target.files[i])
      }
    }
  }
  input.click()
}

</script>

<template>
  <div style="display: flex; flex-direction: row">
    <a-col>
      <div class="tag-history-title">提交历史</div>
      <tag-history-item v-for="tag in tags" :key="tag"
                        :tag="tag"
                        @click="() => onTagHistoryCheck(tag)"
                        @delete="() => onTagHistoryDelete(tag)"/>
    </a-col>
    <div class="divider"/>
    <a-col style="width: 100%">
      <a-row style="width: 100%; margin-bottom: 8px">
        <a-button :icon="h(PlusOutlined)" type="primary" @click="onAddFile">添加文件</a-button>
      </a-row>
      <div style="width: 100%" @dragover.prevent="() => {}" @drop.prevent="onFileDrop">
        <a-table :columns="columns" :data-source="files" :pagination="false"
                 :row-selection="rowSelection"
                 rowKey="path" size="small">
          <template #headerCell="{ column }">
            <template v-if="column.key === 'status'">
            <span>
              {{ column.title }}
              <reload-outlined @click="() => reloadFileList()"/>
            </span>
            </template>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'path'">
              <div style="word-break: break-all;">{{ record.path }}</div>
            </template>
            <template v-if="column.dataIndex === 'status'">
              <a-spin v-if="record.status === 'loading'"/>
              <a-tag v-else :color="STATUS_INFO[record.status as STATUS].color">
                {{ STATUS_INFO[record.status as STATUS].text }}
              </a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <span>
                <template v-if="record.status !== 'not-found'">
                  <a @click="() => onFileOpen(record.path)">打开</a>
                  <a-divider type="vertical"/>
                </template>
                <a @click="() => onFileDelete(record.path)">删除</a>
              </span>
            </template>
          </template>
          <template #emptyText>
            <a-empty description="拖拽选择文件"></a-empty>
          </template>
        </a-table>
      </div>
      <a-form :label-col="{ style: { width: '80px' } }"
              labelAlign="left" style="margin-top: 16px">
        <a-form-item
            label="Message"
            name="Message">
          <a-input v-model:value="message" placeholder="请输入提交信息（可选）"/>
        </a-form-item>
        <a-form-item
            label="标签(TAG)*"
            name="tag">
          <a-auto-complete v-model:value="tag" :options="tagCompletes" allow-clear placeholder="请输入TAG"
                           @select="onTagSelect">
            <template #option="item">
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span>{{ item.value }}</span>
                <close-outlined @click.prevent="() => onTagHistoryDelete(item.value)"/>
              </div>
            </template>
          </a-auto-complete>
        </a-form-item>
        <a-form-item style="margin-left: 80px">
          <a-button :loading="buttonState.commitLoading"
                    type="primary" @click="onCommit">提交&TAG
          </a-button>
          <a-button :loading="buttonState.historyLoading"
                    style="margin-left: 8px"
                    type="default" @click="onHistory">获取清单
          </a-button>
        </a-form-item>
      </a-form>
    </a-col>
  </div>
  <contextHolder/>
</template>

<style scoped>
.ant-form-item {
  margin-bottom: 8px;
}

.divider {
  width: 1px;
  background: #f0f0f0;
  margin-left: 1rem;
  margin-right: 1rem;
}

.tag-history-title {
  font-size: 16px;
  font-weight: bold;
  width: 200px;
  margin-bottom: 8px;
}
</style>
