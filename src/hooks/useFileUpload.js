import { useState, useCallback } from 'react'

export const useFileUpload = (s3Service, currentPath, onUploadComplete) => {
  const [showUpload, setShowUpload] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadStats, setUploadStats] = useState({})

  const handleFileUpload = useCallback(
    async (files) => {
      for (const file of Array.from(files)) {
        const key = currentPath + file.name
        const startTime = Date.now()
        let lastTime = startTime
        let lastLoaded = 0

        setUploadProgress((p) => ({ ...p, [file.name]: 0 }))
        setUploadStats((s) => ({
          ...s,
          [file.name]: {
            speed: 0,
            timeRemaining: 0,
            startTime,
            size: file.size
          }
        }))

        try {
          await s3Service.uploadFile(file, key, (prog, loaded = 0) => {
            const now = Date.now()
            const timeDiff = (now - lastTime) / 1000 // seconds
            const dataDiff = loaded - lastLoaded

            if (timeDiff > 0.5) { // Update every 500ms for smooth display
              const speed = dataDiff / timeDiff // bytes per second
              const totalTime = (now - startTime) / 1000
              const avgSpeed = loaded / totalTime
              const remaining = avgSpeed > 0 ? (file.size - loaded) / avgSpeed : 0

              setUploadStats((s) => ({
                ...s,
                [file.name]: {
                  ...s[file.name],
                  speed: speed,
                  timeRemaining: remaining,
                  avgSpeed: avgSpeed
                }
              }))

              lastTime = now
              lastLoaded = loaded
            }

            setUploadProgress((p) => ({ ...p, [file.name]: prog }))
          })
        } catch (e) {
          console.error('Upload error:', e)
          alert(`Upload failed: ${e.message}`)
        } finally {
          setUploadProgress((p) => {
            const { [file.name]: _, ...rest } = p
            return rest
          })
          setUploadStats((s) => {
            const { [file.name]: _, ...rest } = s
            return rest
          })
        }
      }

      if (onUploadComplete) {
        await onUploadComplete()
      }
      setShowUpload(false)
    },
    [currentPath, s3Service, onUploadComplete]
  )

  return {
    showUpload,
    setShowUpload,
    uploadProgress,
    uploadStats,
    handleFileUpload
  }
}