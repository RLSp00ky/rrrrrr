import { defineConfig } from 'vite'
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  server: {
    port: 5000,
    configureServer(server) {
      // Handle /index.html the same as /
      server.middlewares.use('/index.html', (req, res, next) => {
        req.url = '/';
        next();
      });
      
      // Add backend routes to Vite's middleware
      server.middlewares.use('/env-config', (req, res) => {
        res.json({
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
          TURN_USERNAME: process.env.TURN_USERNAME,
          TURN_CREDENTIAL: process.env.TURN_CREDENTIAL
        })
      })

      // Setup WebSocket on the same server
      const wss = new WebSocketServer({ server: server.httpServer })
      
      const clients = new Map()
      const clientUsers = new Map()
      const searchingClients = new Set()
      const partnerships = new Map()

      function generateClientId() {
        return Math.random().toString(36).substr(2, 9)
      }

      wss.on('connection', (ws) => {
        const clientId = generateClientId()
        clients.set(clientId, ws)
        
        console.log(`🔌 Client ${clientId} connected`)
        
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString())
            console.log(`📩 Message from ${clientId}:`, data.type)
            
            switch (data.type) {
              case 'search':
                handleSearch(clientId, ws, data.userId)
                break
              case 'stopSearch':
                handleStopSearch(clientId)
                break
              case 'skipToNext':
                handleSkipToNext(clientId, ws)
                break
              case 'offer':
              case 'answer':
              case 'candidate':
                forwardToPartner(clientId, data)
                break
            }
          } catch (error) {
            console.error('Error parsing message:', error)
          }
        })
        
        ws.on('close', () => {
          console.log(`🔌 Client ${clientId} disconnected`)
          clients.delete(clientId)
          searchingClients.delete(clientId)
          
          const partnerId = partnerships.get(clientId)
          if (partnerId) {
            partnerships.delete(clientId)
            partnerships.delete(partnerId)
            
            const partnerWs = clients.get(partnerId)
            if (partnerWs && partnerWs.readyState === 1) {
              partnerWs.send(JSON.stringify({ type: 'skipToNext' }))
            }
          }
        })
      })

      function handleSearch(clientId, ws, userId) {
        if (searchingClients.size === 0) {
          searchingClients.add(clientId)
          clientUsers.set(clientId, userId)
          ws.send(JSON.stringify({ type: 'searching' }))
        } else {
          const partnerId = Array.from(searchingClients)[0]
          const partnerWs = clients.get(partnerId)
          
          if (partnerWs && partnerWs.readyState === 1) {
            partnerships.set(clientId, partnerId)
            partnerships.set(partnerId, clientId)
            
            searchingClients.delete(partnerId)
            
            ws.send(JSON.stringify({ 
              type: 'matched', 
              partnerId: clientUsers.get(partnerId),
              isInitiator: true 
            }))
            
            partnerWs.send(JSON.stringify({ 
              type: 'matched', 
              partnerId: userId,
              isInitiator: false 
            }))
          }
        }
      }

      function handleStopSearch(clientId) {
        searchingClients.delete(clientId)
      }

      function handleSkipToNext(clientId, ws) {
        const partnerId = partnerships.get(clientId)
        if (partnerId) {
          partnerships.delete(clientId)
          partnerships.delete(partnerId)
          
          const partnerWs = clients.get(partnerId)
          if (partnerWs && partnerWs.readyState === 1) {
            partnerWs.send(JSON.stringify({ type: 'skipToNext' }))
          }
        }
        
        searchingClients.add(clientId)
        ws.send(JSON.stringify({ type: 'searching' }))
      }

      function forwardToPartner(clientId, data) {
        const partnerId = partnerships.get(clientId)
        if (partnerId) {
          const partnerWs = clients.get(partnerId)
          if (partnerWs && partnerWs.readyState === 1) {
            partnerWs.send(JSON.stringify(data))
          }
        }
      }

      console.log('🔌 WebSocket server configured on Vite server')
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})