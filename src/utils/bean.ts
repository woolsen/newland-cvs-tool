import {STATUS} from "./cvs-utils";

export type FileStatus = STATUS | 'loading' | 'error' | 'not-found' | 'not-cvs-file'

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
