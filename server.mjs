#!/bin/env/node
import fs from 'fs'

process.env.NITRO_SSL_CERT = fs.readFileSync('cert.pem')
process.env.NITRO_SSL_KEY = fs.readFileSync('key.pem')

await import('./.output/server/index.mjs')