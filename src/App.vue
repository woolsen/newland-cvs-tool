<script lang="ts" setup>
import {onMounted, reactive, ref} from 'vue'
import {message as antMessage, Modal, notification, TableProps} from "ant-design-vue";
import {Key, type TableRowSelection} from "ant-design-vue/es/table/interface";
import {commit, getHistory, getStatus, updateTag} from "./utils/cvs";
import TagStore from "./store/tag";
import {CompleteText, FileDetail} from "./utils/bean";
import {CloseOutlined} from '@ant-design/icons-vue';

let allTags: string[] = []

const message = ref<string>('')
const tags = ref<CompleteText[]>([])
const tag = ref<string>('')
const files = ref<FileDetail[]>([])

const rowSelection: TableRowSelection<FileDetail> = reactive({
  selectedRowKeys: [],
  onChange: (selectedRowKeys: Key[], selectedRows: FileDetail[]) => {
    console.log('selectedRowKeys changed: ', selectedRowKeys);
    files.value.forEach(f => f.selected = selectedRowKeys.includes(f.path))
    rowSelection.selectedRowKeys = selectedRowKeys
  },
  getCheckboxProps: (record: FileDetail) => ({
    disabled: record.status === 'error',
  }),
})

const [modal, contextHolder] = Modal.useModal();

onMounted(() => {
  allTags = TagStore.getTags()
  if (!allTags.length) {
    return
  }
  tags.value = allTags.map(t => new CompleteText(t))
  tag.value = allTags.length ? allTags[0] : ''
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
    width: 100
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    width: 60
  },
]

const buttonState = reactive({
  commitLoading: false,
  historyLoading: false,
})

const updateStatus = async (file: FileDetail) => {
  try {
    file.status = await getStatus(file.path)
  } catch (e: any) {
    console.error(e)
    notification.error({
      message: `获取 ${file.name} 状态失败`,
      description: e.message,
      duration: 2,
      placement: 'bottomRight'
    })
    file.status = 'error'
  }
};

const onTagSearch = (value: string) => {
  tags.value = allTags.filter(t => t.includes(value)).map(t => new CompleteText(t))
}

const onTagSelect = (value: string) => {
  tag.value = value
  const filesValue = TagStore.getTagFiles(tag.value)
  if (filesValue.length) {
    files.value = filesValue
  }
};

const onTagDelete = (value: string) => {
  TagStore.removeTag(value)
  allTags = TagStore.getTags()
  tags.value = allTags.map(t => new CompleteText(t))
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const eFiles = e.dataTransfer?.files
  if (eFiles && eFiles.length) {
    for (let i = 0; i < eFiles.length; i++) {
      addFile(eFiles[i])
    }
  }
}

function addFile(file: File) {
  if (files.value.find(f => f.path === file.path)) {
    return;
  }
  const detail = new FileDetail(file.name, file.path);
  files.value.push(detail);
  updateStatus(detail).then(() => {
    files.value = [...files.value];
  });
}

const handleDelete = (path: Key) => {
  const index = files.value.findIndex(f => f.path === path)
  if (index >= 0) {
    files.value.splice(index, 1)
  }
}

const handleCommit = async () => {
  const filesValue = files.value
  const filesToCommit = filesValue.filter(f => f.selected)
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
  const messageKey = 'commit';
  antMessage.loading({content: '提交中...', key: messageKey, duration: 0});
  console.log('commit file:', filesToCommit)
  console.log('commit message:', message.value)
  console.log('update tag:', tag.value)
  const successFiles: FileDetail[] = []
  for (let file of filesToCommit) {
    console.log('committing', file.path)
    try {
      antMessage.loading({content: `提交 ${file.name} 中...`, key: messageKey, duration: 0});
      await commit(file.path, message.value)
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
      await updateTag(file.path, tag.value)
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
    successFiles.push(file)
  }

  let historyStr = ''
  for (let file of successFiles) {
    historyStr += await getHistory(file.path) + '\n'
  }
  modal.info({
    title: '提交历史',
    content: historyStr,
    width: '100%',
    okText: '好的',
  });

  antMessage.success({content: '提交完成', key: messageKey, duration: 2});
  console.log('commit done')

  let tagsValue = TagStore.addTag(tag.value)
  tags.value = tagsValue.map(t => new CompleteText(t))
  TagStore.setTagFiles(tag.value, filesValue)

  buttonState.commitLoading = false
}

const handleHistory = async () => {
  const filesValue = files.value
  const filesToCommit = filesValue.filter(f => f.selected)
  if (!filesToCommit.length) {
    antMessage.error('请选择文件')
    return
  }
  buttonState.historyLoading = true
  const messageKey = 'history';
  antMessage.loading({content: '获取历史中...', key: messageKey, duration: 0});
  console.log('get history file:', filesToCommit)
  let historyStr = ''
  for (let file of filesToCommit) {
    historyStr += await getHistory(file.path) + '\n'
  }
  modal.info({
    title: '提交历史',
    content: historyStr,
    width: '100%',
    okText: '好的',
  });
  antMessage.success({content: '获取历史完成', key: messageKey, duration: 2});
  console.log('get history done')
  buttonState.historyLoading = false
}

</script>

<template>
  <div style="width: 100%" @dragover.prevent="() => {}" @drop.prevent="handleDrop">
    <a-table :columns="columns" :data-source="files" :pagination="false"
             :row-selection="rowSelection"
             rowKey="path" size="small">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'status'">
          <a-spin v-if="record.status === 'loading'"/>
          <a-tag v-else-if="record.status === 'error'" color="red">
            {{ record.status }}
          </a-tag>
          <a-tag v-else color="green">
            {{ record.status }}
          </a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'action'">
          <a @click="() => handleDelete(record.path)">删除</a>
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
        label="TAG*"
        name="tag">
      <a-auto-complete v-model:value="tag" :options="tags" allow-clear placeholder="请输入TAG"
                       @search="onTagSearch" @select="onTagSelect">
        <template #option="item">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ item.value }}</span>
            <close-outlined @click.prevent="() => onTagDelete(item.value)"/>
          </div>
        </template>
      </a-auto-complete>
    </a-form-item>
    <a-form-item style="margin-left: 80px">
      <a-button :loading="buttonState.commitLoading"
                type="primary" @click="handleCommit">提交并TAG
      </a-button>
      <a-button :loading="buttonState.historyLoading"
                style="margin-left: 8px"
                type="default" @click="handleHistory">获取历史
      </a-button>
    </a-form-item>
  </a-form>
  <contextHolder/>
</template>

<style scoped>
.ant-form-item {
  margin-bottom: 8px;
}
</style>
