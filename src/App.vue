<script setup lang="ts">
import {ref} from 'vue'
import {TableProps} from "ant-design-vue";
import {Key} from "ant-design-vue/es/table/interface";
// import {ipcRenderer} from "electron";

class FileDetail {
  name: string
  path: string
  tag?: string

  constructor(name: string, path: string) {
    this.name = name
    this.path = path
  }
}

const files = ref<FileDetail[]>([])

const columns: TableProps<FileDetail>['columns'] = [
  {
    title: '文件路径',
    dataIndex: 'path',
    key: 'path',
  },
  {
    title: 'TAG',
    dataIndex: 'tag',
    key: 'tag',
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
  },
]

window.ipcRenderer.invoke('cmd', 'dir')

const rowSelection: TableProps<FileDetail>['rowSelection'] = {};

async function fetchTag(path: string): Promise<string> {
  console.log(window.ipcRenderer)
  const result = await window.ipcRenderer.invoke('cmd', 'ls')
  console.log(result)
  return 'some tag'
}

const updateTag = async (file: FileDetail) => {
  console.log('fetch tag...');
  file.tag = await fetchTag(file.path);
  console.log('fetch tag done');
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
  updateTag(detail).then(() => {
    files.value = [...files.value];
  });
}

const handleDelete = (path: Key) => {
  const index = files.value.findIndex(f => f.path === path)
  if (index >= 0) {
    files.value.splice(index, 1)
  }
}
</script>

<template>
  <a-col @dragover.prevent="() => {}" @drop.prevent="handleDrop" style="width: 100%">
    <a-table size="small" :pagination="false" :data-source="files" rowKey="path"
             :row-selection="rowSelection" :columns="columns">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'tag'">
          <a-tag v-if="record.tag">{{ record.tag }}</a-tag>
          <a-spin v-else/>
        </template>
        <template v-else-if="column.dataIndex === 'action'">
          <a @click="() => handleDelete(record.path)">删除</a>
        </template>
      </template>
      <template #emptyText>
        <a-empty description="拖拽即可选择文件"></a-empty>
      </template>
    </a-table>
  </a-col>
</template>

<style>
</style>
