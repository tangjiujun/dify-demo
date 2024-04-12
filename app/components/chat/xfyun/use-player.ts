import { useRef, useState } from 'react'
import AudioPlayer from '@/utils/xfyun/tts.umd'
import { getWebSocket } from '@/app/api/utils/socket'
import type { XfAudioPlay } from '@/app/components/chat/xfyun/xf-util'
import { getPlayWebSocketUrl, getPlayerParam } from '@/app/components/chat/xfyun/xf-util'

const playMessage = (socket: WebSocket, currentAudio: XfAudioPlay, message: string): Promise<{
  socket: WebSocket
  audio: XfAudioPlay
}> => {
  // 在组件挂载时建立 socket 连接
  return new Promise((resolve, reject) => {
    socket.onerror = (e) => {
      console.error('socket.onerror', e)
      reject(e)
    }
    socket.onclose = (e) => {
      console.log('socket.onclose', e)
      resolve({
        socket,
        audio: currentAudio,
      })
    }
    socket.onopen = () => {
      console.log('socket.onopen')
      currentAudio?.start?.({
        autoPlay: true,
        sampleRate: 16000,
        resumePlayDuration: 1000,
      })
      socket.send(JSON.stringify(getPlayerParam(message)))
    }
    socket.onmessage = (e) => {
      console.log('socket.onmessage')
      const jsonData = JSON.parse(e.data)
      // 合成失败
      if (jsonData.code !== 0)
        console.error(jsonData)

      currentAudio?.postMessage({
        type: 'base64',
        data: jsonData.data.audio,
        // isLastData: jsonData.data.status === 2,
      })
    }
  })
}

export const usePlayer = () => {
  const playerSocket = useRef<WebSocket | null>(null)
  const audioPlayer = useRef<XfAudioPlay | null>(null)
  const [defaultReading, setDefaultReading] = useState(false)

  const handleStop = () => {
    playerSocket.current?.close()
    audioPlayer.current?.stop()
  }

  const handlePlay = async (message: string) => {
    setDefaultReading(false)
    const socket = getWebSocket(getPlayWebSocketUrl())
    const currentAudio = (new AudioPlayer('./tts') as unknown as XfAudioPlay)
    playerSocket.current = socket
    audioPlayer.current = currentAudio
    // 判断当前是否有语言，有则终止，终止后再播放当前语音，如果是还在描写中则逐个播放
    await playMessage(socket, currentAudio, message)
    console.log('playMessage end')
  }

  return {
    defaultReading,
    setDefaultReading,
    handlePlay,
    handleStop,
  }
}
