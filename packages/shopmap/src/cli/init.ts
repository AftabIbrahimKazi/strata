import { runExtract } from './extract.js'
import * as readline from 'readline'

function ask(rl: readline.Interface, question: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || (defaultValue ?? ''))
    })
  })
}

async function askBool(rl: readline.Interface, question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]'
  const answer = await ask(rl, `${question} ${hint}`)
  if (!answer) return defaultYes
  return /^y/i.test(answer)
}

export async function runInit(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  console.log('\nShopMap Setup\n')

  try {
    const latStr = await ask(rl, 'Shop latitude')
    const lat = parseFloat(latStr)
    if (isNaN(lat)) { console.error('Invalid latitude'); process.exit(1) }

    const lngStr = await ask(rl, 'Shop longitude')
    const lng = parseFloat(lngStr)
    if (isNaN(lng)) { console.error('Invalid longitude'); process.exit(1) }

    const region = await ask(rl, 'Region code (IN, US, GB, … or leave blank for default)', 'default')
    const out    = await ask(rl, 'Output directory', 'public/')
    const landmarks = await askBool(rl, 'Include nearby landmarks?', true)

    let radius = 500
    if (landmarks) {
      const rStr = await ask(rl, 'Landmark search radius (meters)', '500')
      radius = parseInt(rStr) || 500
    }

    await runExtract({ lat, lng, region, radius, landmarks, out })
  } finally {
    rl.close()
  }
}
