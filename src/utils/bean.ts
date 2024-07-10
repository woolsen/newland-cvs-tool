import {STATUS} from "./cvs";

export class FileDetail {
  name: string
  path: string
  selected: boolean
  status: STATUS | 'loading' | 'error'

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
