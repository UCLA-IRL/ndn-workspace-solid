import { fchQuery } from '@ndn/autoconfig'

export const doFch = async () => {
  try {
    const fchRes = await fchQuery({
      transport: 'wss',
      network: 'ndn',
    })

    if (fchRes.routers.length > 0) {
      return new URL(fchRes.routers[0].connect)
    }
  } catch {
    console.error('FCH server is down.')
  }

  return null
}
