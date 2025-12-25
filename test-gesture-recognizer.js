/**
 * Test script for the enhanced gesture recognizer
 */

import { getGestureRecognizer } from './lib/gesture-recognizer'

async function testGestureRecognition() {
  const recognizer = getGestureRecognizer()

  // Test circle gesture
  const circlePoints = [
    { x: 50, y: 10 },
    { x: 90, y: 50 },
    { x: 50, y: 90 },
    { x: 10, y: 50 },
    { x: 50, y: 10 }
  ]

  console.log('Testing circle gesture...')
  const circleResult = await recognizer.recognize(circlePoints)
  console.log('Circle result:', circleResult)

  // Test arrow right gesture
  const arrowRightPoints = [
    { x: 10, y: 50 },
    { x: 40, y: 50 },
    { x: 70, y: 35 },
    { x: 90, y: 50 },
    { x: 70, y: 65 }
  ]

  console.log('Testing arrow right gesture...')
  const arrowResult = await recognizer.recognize(arrowRightPoints)
  console.log('Arrow right result:', arrowResult)

  // Test direction detection
  console.log('Testing direction detection...')
  const rightDirection = recognizer.getDirection([
    { x: 10, y: 50 },
    { x: 90, y: 50 }
  ])
  console.log('Right direction:', rightDirection)

  const upDirection = recognizer.getDirection([
    { x: 50, y: 90 },
    { x: 50, y: 10 }
  ])
  console.log('Up direction:', upDirection)
}

// Run the test
testGestureRecognition().catch(console.error)