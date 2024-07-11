import {STATUS} from "./cvs";

export type FileStatus = 'loading' | 'error' | 'not-found' | STATUS

export class FileDetail {
  name: string
  path: string
  selected: boolean
  status: FileStatus

  constructor(name: string, path: string) {
    this.name = name
    this.path = path
    this.selected = true
    this.status = 'loading'
  }
}

export class CompleteText {
  value: string

  constructor(value: string) {
    this.value = value
  }
}

export interface StatusInfo {
  text: string;
  color: string;
  selectable: boolean;
}

export const STATUS_INFO: { [key in FileStatus]: StatusInfo } = {
  [STATUS.UNKNOWN]: { text: '待提交', color: 'green', selectable: true },
  [STATUS.MODIFIED]: { text: '已修改', color: 'green', selectable: true },
  [STATUS.ADDED]: { text: '已添加', color: 'green', selectable: true },
  [STATUS.REMOVED]: { text: '已删除', color: 'green', selectable: true },
  [STATUS.CONFLICT]: { text: '冲突', color: 'green', selectable: true },
  [STATUS.UP_TO_DATE]: { text: '最新', color: 'blue', selectable: true },
  [STATUS.NOT_CVS_FILE]: { text: '非CVS文件', color: 'red', selectable: false },
  "not-found": { text: '文件不存在', color: 'red', selectable: false },
  "loading": { text: '加载中', color: 'pink', selectable: false },
  "error": { text: '错误', color: 'red', selectable: false },
};