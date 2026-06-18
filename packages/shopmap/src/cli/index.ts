import { Command } from 'commander'
import { runExtract } from './extract.js'
import { runInit } from './init.js'

const pkg = { version: '0.1.0' }

const program = new Command()

program
  .name('shopmap')
  .description('ShopMap CLI — generate map tiles and landmarks for your shop')
  .version(pkg.version)

program
  .command('init')
  .description('Interactive setup — generates map.pmtiles and landmarks.json')
  .action(async () => {
    await runInit()
  })

program
  .command('extract')
  .description('Non-interactive tile and landmark extraction')
  .requiredOption('--lat <number>', 'Shop latitude')
  .requiredOption('--lng <number>', 'Shop longitude')
  .option('--region <code>', 'Region code (IN, US, GB, …)', 'default')
  .option('--radius <meters>', 'Search radius in meters', '10000')
  .option('--landmarks', 'Include nearby landmarks', false)
  .option('--out <dir>', 'Output directory', './public')
  .action(async (opts: {
    lat: string
    lng: string
    region: string
    radius: string
    landmarks: boolean
    out: string
  }) => {
    await runExtract({
      lat:       parseFloat(opts.lat),
      lng:       parseFloat(opts.lng),
      region:    opts.region,
      radius:    parseInt(opts.radius),
      landmarks: opts.landmarks,
      out:       opts.out,
    })
  })

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
