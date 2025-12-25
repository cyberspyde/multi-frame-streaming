/**
 * Enhanced Gesture Recognizer using improved $1 Unistroke algorithm
 * Better templates and recognition for common gestures
 */

interface Point {
  x: number
  y: number
}

interface Template {
  name: string
  points: Point[]
}

export class GestureRecognizer {
  private templates: Template[] = []

  constructor() {
    this.initializeTemplates()
  }

  /**
   * Initialize gesture templates with common shapes
   */
  private initializeTemplates() {
    // Numbers 0-9
    this.templates = [
      // 0 - circle
      { name: '0', points: this.generateCirclePoints(8) },
      // 1 - vertical line
      { name: '1', points: this.generateLinePoints(0, 0, 0, 100, 8) },
      // 2 - S-curve
      { name: '2', points: this.generateSCurvePoints(8) },
      // 3 - backwards S
      { name: '3', points: this.generateBackwardsSCurvePoints(8) },
      // 4 - L shape
      { name: '4', points: this.generateLShapePoints(8) },
      // 5 - backwards L
      { name: '5', points: this.generateBackwardsLShapePoints(8) },
      // 6 - question mark shape
      { name: '6', points: this.generateQuestionMarkPoints(8) },
      // 7 - diagonal line
      { name: '7', points: this.generateLinePoints(0, 100, 100, 0, 8) },
      // 8 - infinity symbol
      { name: '8', points: this.generateInfinityPoints(8) },
      // 9 - backwards question mark
      { name: '9', points: this.generateBackwardsQuestionMarkPoints(8) },

      // Symbols
      { name: 'circle', points: this.generateCirclePoints(12) },
      { name: 'square', points: this.generateSquarePoints(8) },
      { name: 'triangle', points: this.generateTrianglePoints(6) },
      { name: 'check', points: this.generateCheckMarkPoints(6) },
      { name: 'x', points: this.generateXPoints(8) },
      { name: 'arrow_right', points: this.generateArrowRightPoints(8) },
      { name: 'arrow_left', points: this.generateArrowLeftPoints(8) },
      { name: 'arrow_up', points: this.generateArrowUpPoints(8) },
      { name: 'arrow_down', points: this.generateArrowDownPoints(8) },
    ]
  }

  /**
   * Recognize a gesture using enhanced $1 Unistroke algorithm
   */
  async recognize(points: Point[]): Promise<{ gesture: string; confidence: number }> {
    if (points.length < 8) {
      return { gesture: 'unknown', confidence: 0 }
    }

    try {
      // Resample to standard number of points
      const resampledPoints = this.resample(points, 64)

      // Rotate to find best match
      const rotatedPoints = this.rotateToZero(resampledPoints)

      // Scale to square
      const scaledPoints = this.scaleToSquare(rotatedPoints)

      // Translate to origin
      const translatedPoints = this.translateToOrigin(scaledPoints)

      // Find best matching template
      let bestDistance = Infinity
      let bestTemplate = 'unknown'

      for (const template of this.templates) {
        const distance = this.distanceAtBestAngle(translatedPoints, template.points)
        if (distance < bestDistance) {
          bestDistance = distance
          bestTemplate = template.name
        }
      }

      // Convert distance to confidence (lower distance = higher confidence)
      const confidence = Math.max(0, Math.min(1, 1 - (bestDistance / 2.0)))

      // If confidence is too low, try direction-based fallback
      if (confidence < 0.3) {
        const directionResult = this.getDirection(points)
        if (directionResult !== 'none') {
          const directionMap: Record<string, string> = {
            'right': 'next',
            'left': 'prev',
            'up': 'arrow_up',
            'down': 'arrow_down'
          }
          return { gesture: directionMap[directionResult], confidence: 0.7 }
        }
      }

      return { gesture: bestTemplate, confidence }

    } catch (error) {
      console.warn('Gesture recognition failed, using direction fallback:', error)

      // Fallback to simple direction recognition
      const direction = this.getDirection(points)
      if (direction !== 'none') {
        const directionMap: Record<string, string> = {
          'right': 'next',
          'left': 'prev',
          'up': 'arrow_up',
          'down': 'arrow_down'
        }
        return { gesture: directionMap[direction], confidence: 0.6 }
      }

      return { gesture: 'unknown', confidence: 0 }
    }
  }

  /**
   * Convert gesture path to canvas image
   */
  private async pathToImage(points: Point[]): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas')
    canvas.width = 224
    canvas.height = 224
    const ctx = canvas.getContext('2d')

    if (!ctx) throw new Error('Could not get canvas context')

    // Clear with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 224, 224)

    // Normalize points to fit canvas
    const minX = Math.min(...points.map(p => p.x))
    const maxX = Math.max(...points.map(p => p.x))
    const minY = Math.min(...points.map(p => p.y))
    const maxY = Math.max(...points.map(p => p.y))

    const scaleX = 180 / (maxX - minX || 1)
    const scaleY = 180 / (maxY - minY || 1)
    const scale = Math.min(scaleX, scaleY)

    const offsetX = (224 - (maxX - minX) * scale) / 2
    const offsetY = (224 - (maxY - minY) * scale) / 2

    // Draw gesture path
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    const normalizedPoints = points.map(p => ({
      x: offsetX + (p.x - minX) * scale,
      y: offsetY + (p.y - minY) * scale
    }))

    if (normalizedPoints.length > 0) {
      ctx.moveTo(normalizedPoints[0].x, normalizedPoints[0].y)
      for (let i = 1; i < normalizedPoints.length; i++) {
        ctx.lineTo(normalizedPoints[i].x, normalizedPoints[i].y)
      }
    }

    ctx.stroke()
    return canvas
  }

  /**
   * Convert canvas to blob
   */
  private async canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      }, 'image/jpeg', 0.9)
    })
  }

  /**
   * Convert blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Resample points to a standard number
   */
  private resample(points: Point[], n: number): Point[] {
    const I = this.pathLength(points) / (n - 1)
    let D = 0
    const newPoints: Point[] = [points[0]]

    for (let i = 1; i < points.length; i++) {
      const d = this.distance(points[i - 1], points[i])
      if (D + d >= I) {
        const qx = points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x)
        const qy = points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y)
        const q = { x: qx, y: qy }
        newPoints.push(q)
        points.splice(i, 0, q)
        D = 0
      } else {
        D += d
      }
    }

    // Add the last point if we don't have enough points
    while (newPoints.length < n) {
      newPoints.push(points[points.length - 1])
    }

    return newPoints.slice(0, n)
  }

  /**
   * Rotate points to zero angle
   */
  private rotateToZero(points: Point[]): Point[] {
    const centroid = this.centroid(points)
    const theta = Math.atan2(centroid.y - points[0].y, centroid.x - points[0].x)
    return this.rotateBy(points, -theta)
  }

  /**
   * Scale points to fit in a square
   */
  private scaleToSquare(points: Point[]): Point[] {
    const bbox = this.boundingBox(points)
    const size = Math.max(bbox.width, bbox.height)
    const newPoints: Point[] = []

    for (const point of points) {
      newPoints.push({
        x: point.x * (100 / size),
        y: point.y * (100 / size)
      })
    }

    return newPoints
  }

  /**
   * Translate points to origin
   */
  private translateToOrigin(points: Point[]): Point[] {
    const centroid = this.centroid(points)
    const newPoints: Point[] = []

    for (const point of points) {
      newPoints.push({
        x: point.x - centroid.x,
        y: point.y - centroid.y
      })
    }

    return newPoints
  }

  /**
   * Find best angle for matching
   */
  private distanceAtBestAngle(points: Point[], template: Point[]): number {
    const thetaA = -Math.PI / 4
    const thetaB = Math.PI / 4
    const deltaTheta = Math.PI / 90

    let bestDistance = Infinity

    for (let theta = thetaA; theta <= thetaB; theta += deltaTheta) {
      const rotatedPoints = this.rotateBy(points, theta)
      const distance = this.pathDistance(rotatedPoints, template)
      if (distance < bestDistance) {
        bestDistance = distance
      }
    }

    return bestDistance
  }

  /**
   * Helper methods for $1 algorithm
   */
  private pathLength(points: Point[]): number {
    let length = 0
    for (let i = 1; i < points.length; i++) {
      length += this.distance(points[i - 1], points[i])
    }
    return length
  }

  private distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  private centroid(points: Point[]): Point {
    let x = 0, y = 0
    for (const point of points) {
      x += point.x
      y += point.y
    }
    return { x: x / points.length, y: y / points.length }
  }

  private rotateBy(points: Point[], theta: number): Point[] {
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    const centroid = this.centroid(points)
    const newPoints: Point[] = []

    for (const point of points) {
      const dx = point.x - centroid.x
      const dy = point.y - centroid.y
      newPoints.push({
        x: dx * cos - dy * sin + centroid.x,
        y: dx * sin + dy * cos + centroid.y
      })
    }

    return newPoints
  }

  private boundingBox(points: Point[]): { width: number; height: number } {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

    for (const point of points) {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }

    return { width: maxX - minX, height: maxY - minY }
  }

  private pathDistance(points1: Point[], points2: Point[]): number {
    let distance = 0
    for (let i = 0; i < Math.min(points1.length, points2.length); i++) {
      distance += this.distance(points1[i], points2[i])
    }
    return distance / Math.min(points1.length, points2.length)
  }

  /**
   * Get direction of the gesture (for simple left/right detection)
   */
  getDirection(points: Point[]): 'left' | 'right' | 'up' | 'down' | 'none' {
    if (points.length < 5) return 'none'

    const first = points[0]
    const last = points[points.length - 1]

    const dx = last.x - first.x
    const dy = last.y - first.y

    // Calculate if it's primarily horizontal or vertical
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    // Need significant movement
    if (absDx < 30 && absDy < 30) return 'none'

    if (absDx > absDy) {
      // Horizontal movement
      return dx > 0 ? 'right' : 'left'
    } else {
      // Vertical movement
      return dy > 0 ? 'down' : 'up'
    }
  }

  // Template generation methods
  private generateCirclePoints(n: number): Point[] {
    const points: Point[] = []
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI
      points.push({
        x: 50 + 40 * Math.cos(angle),
        y: 50 + 40 * Math.sin(angle)
      })
    }
    return points
  }

  private generateLinePoints(x1: number, y1: number, x2: number, y2: number, n: number): Point[] {
    const points: Point[] = []
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      points.push({
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      })
    }
    return points
  }

  private generateSCurvePoints(n: number): Point[] {
    const points: Point[] = []
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const x = t * 100
      const y = 50 + 30 * Math.sin(t * Math.PI)
      points.push({ x, y })
    }
    return points
  }

  private generateBackwardsSCurvePoints(n: number): Point[] {
    const points: Point[] = []
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const x = t * 100
      const y = 50 - 30 * Math.sin(t * Math.PI)
      points.push({ x, y })
    }
    return points
  }

  private generateLShapePoints(n: number): Point[] {
    const points: Point[] = []
    // Vertical line
    for (let i = 0; i < n/2; i++) {
      points.push({ x: 20, y: 20 + (i / (n/2 - 1)) * 60 })
    }
    // Horizontal line
    for (let i = 0; i < n/2; i++) {
      points.push({ x: 20 + (i / (n/2 - 1)) * 60, y: 80 })
    }
    return points
  }

  private generateBackwardsLShapePoints(n: number): Point[] {
    const points: Point[] = []
    // Horizontal line
    for (let i = 0; i < n/2; i++) {
      points.push({ x: 20 + (i / (n/2 - 1)) * 60, y: 20 })
    }
    // Vertical line
    for (let i = 0; i < n/2; i++) {
      points.push({ x: 80, y: 20 + (i / (n/2 - 1)) * 60 })
    }
    return points
  }

  private generateQuestionMarkPoints(n: number): Point[] {
    const points: Point[] = []
    // Top curve
    for (let i = 0; i < n/3; i++) {
      const angle = (i / (n/3 - 1)) * Math.PI
      points.push({
        x: 50 + 15 * Math.cos(angle),
        y: 30 + 15 * Math.sin(angle)
      })
    }
    // Vertical line
    for (let i = 0; i < n/3; i++) {
      points.push({ x: 50, y: 45 + (i / (n/3 - 1)) * 25 })
    }
    // Dot
    for (let i = 0; i < n/3; i++) {
      points.push({ x: 50, y: 75 })
    }
    return points
  }

  private generateBackwardsQuestionMarkPoints(n: number): Point[] {
    const points: Point[] = []
    // Top curve
    for (let i = 0; i < n/3; i++) {
      const angle = Math.PI - (i / (n/3 - 1)) * Math.PI
      points.push({
        x: 50 + 15 * Math.cos(angle),
        y: 30 + 15 * Math.sin(angle)
      })
    }
    // Vertical line
    for (let i = 0; i < n/3; i++) {
      points.push({ x: 50, y: 45 + (i / (n/3 - 1)) * 25 })
    }
    // Dot
    for (let i = 0; i < n/3; i++) {
      points.push({ x: 50, y: 75 })
    }
    return points
  }

  private generateInfinityPoints(n: number): Point[] {
    const points: Point[] = []
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * 2 * Math.PI
      const x = 50 + 25 * Math.cos(t)
      const y = 50 + 15 * Math.sin(2 * t)
      points.push({ x, y })
    }
    return points
  }

  private generateSquarePoints(n: number): Point[] {
    const points: Point[] = []
    const side = n / 4
    // Top
    for (let i = 0; i < side; i++) {
      points.push({ x: 20 + (i / (side - 1)) * 60, y: 20 })
    }
    // Right
    for (let i = 0; i < side; i++) {
      points.push({ x: 80, y: 20 + (i / (side - 1)) * 60 })
    }
    // Bottom
    for (let i = 0; i < side; i++) {
      points.push({ x: 80 - (i / (side - 1)) * 60, y: 80 })
    }
    // Left
    for (let i = 0; i < side; i++) {
      points.push({ x: 20, y: 80 - (i / (side - 1)) * 60 })
    }
    return points
  }

  private generateTrianglePoints(n: number): Point[] {
    const points: Point[] = []
    // First side
    for (let i = 0; i < n/3; i++) {
      points.push({
        x: 20 + (i / (n/3 - 1)) * 60,
        y: 80 - (i / (n/3 - 1)) * 30
      })
    }
    // Second side
    for (let i = 0; i < n/3; i++) {
      points.push({
        x: 80 - (i / (n/3 - 1)) * 30,
        y: 50 + (i / (n/3 - 1)) * 30
      })
    }
    // Third side
    for (let i = 0; i < n/3; i++) {
      points.push({
        x: 50 - (i / (n/3 - 1)) * 30,
        y: 50 - (i / (n/3 - 1)) * 30
      })
    }
    return points
  }

  private generateCheckMarkPoints(n: number): Point[] {
    const points: Point[] = []
    // First part (down and right)
    for (let i = 0; i < n/2; i++) {
      const t = i / (n/2 - 1)
      points.push({
        x: 20 + t * 30,
        y: 50 + t * 20
      })
    }
    // Second part (up and right)
    for (let i = 0; i < n/2; i++) {
      const t = i / (n/2 - 1)
      points.push({
        x: 50 + t * 30,
        y: 70 - t * 40
      })
    }
    return points
  }

  private generateXPoints(n: number): Point[] {
    const points: Point[] = []
    // First diagonal
    for (let i = 0; i < n/2; i++) {
      const t = i / (n/2 - 1)
      points.push({
        x: 20 + t * 60,
        y: 20 + t * 60
      })
    }
    // Second diagonal
    for (let i = 0; i < n/2; i++) {
      const t = i / (n/2 - 1)
      points.push({
        x: 80 - t * 60,
        y: 20 + t * 60
      })
    }
    return points
  }

  private generateArrowRightPoints(n: number): Point[] {
    const points: Point[] = []
    // Shaft
    for (let i = 0; i < n/2; i++) {
      points.push({ x: 20 + (i / (n/2 - 1)) * 40, y: 50 })
    }
    // Arrowhead
    points.push({ x: 60, y: 35 })
    points.push({ x: 80, y: 50 })
    points.push({ x: 60, y: 65 })
    return points
  }

  private generateArrowLeftPoints(n: number): Point[] {
    const points: Point[] = []
    // Shaft
    for (let i = 0; i < n/2; i++) {
      points.push({ x: 80 - (i / (n/2 - 1)) * 40, y: 50 })
    }
    // Arrowhead
    points.push({ x: 40, y: 35 })
    points.push({ x: 20, y: 50 })
    points.push({ x: 40, y: 65 })
    return points
  }

  private generateArrowUpPoints(n: number): Point[] {
    const points: Point[] = []
    // Shaft
    for (let i = 0; i < n/2; i++) {
      points.push({ x: 50, y: 80 - (i / (n/2 - 1)) * 40 })
    }
    // Arrowhead
    points.push({ x: 35, y: 40 })
    points.push({ x: 50, y: 20 })
    points.push({ x: 65, y: 40 })
    return points
  }

  private generateArrowDownPoints(n: number): Point[] {
    const points: Point[] = []
    // Shaft
    for (let i = 0; i < n/2; i++) {
      points.push({ x: 50, y: 20 + (i / (n/2 - 1)) * 40 })
    }
    // Arrowhead
    points.push({ x: 35, y: 60 })
    points.push({ x: 50, y: 80 })
    points.push({ x: 65, y: 60 })
    return points
  }
}

// Singleton
let instance: GestureRecognizer | null = null

export function getGestureRecognizer(): GestureRecognizer {
  if (!instance) {
    instance = new GestureRecognizer()
  }
  return instance
}

export const GESTURE_CLASSES = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'circle', 'check', 'x', 'arrow_right', 'arrow_left',
  'arrow_up', 'arrow_down', 'triangle', 'square'
] as const

export type GestureClass = typeof GESTURE_CLASSES[number]
