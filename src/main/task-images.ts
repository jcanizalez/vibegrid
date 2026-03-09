import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { randomUUID } from 'crypto'

const IMAGES_DIR = path.join(app.getPath('userData'), 'task-images')

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function saveTaskImage(taskId: string, sourcePath: string): string {
  const taskDir = path.join(IMAGES_DIR, taskId)
  ensureDir(taskDir)

  const ext = path.extname(sourcePath)
  const filename = `${randomUUID()}${ext}`
  const destPath = path.join(taskDir, filename)

  fs.copyFileSync(sourcePath, destPath)
  return filename
}

export function deleteTaskImage(taskId: string, filename: string): void {
  const filePath = path.join(IMAGES_DIR, taskId, filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

export function getTaskImagePath(taskId: string, filename: string): string {
  return path.join(IMAGES_DIR, taskId, filename)
}

export function cleanupTaskImages(taskId: string): void {
  const taskDir = path.join(IMAGES_DIR, taskId)
  if (fs.existsSync(taskDir)) {
    fs.rmSync(taskDir, { recursive: true, force: true })
  }
}
