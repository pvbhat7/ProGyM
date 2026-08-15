import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

interface Props {
  imageSrc: string
  onConfirm: (croppedDataUrl: string) => void
  onCancel: () => void
}

async function getCroppedImage(imageSrc: string, pixelCrop: Area, rotation: number): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const rad = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const rotW = Math.floor(image.width * cos + image.height * sin)
  const rotH = Math.floor(image.width * sin + image.height * cos)

  const rotCanvas = document.createElement('canvas')
  rotCanvas.width = rotW
  rotCanvas.height = rotH
  const rotCtx = rotCanvas.getContext('2d')!
  rotCtx.translate(rotW / 2, rotH / 2)
  rotCtx.rotate(rad)
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2)

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.drawImage(
    rotCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  return canvas.toDataURL('image/jpeg', 0.88)
}

export default function ImageCropModal({ imageSrc, onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((_: Area, pixelCrop: Area) => {
    setCroppedArea(pixelCrop)
  }, [])

  const handleConfirm = async () => {
    if (!croppedArea) return
    setProcessing(true)
    try {
      const result = await getCroppedImage(imageSrc, croppedArea, rotation)
      onConfirm(result)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <button onClick={onCancel} className="text-white/80 text-sm font-medium px-2 py-1">
          Cancel
        </button>
        <span className="text-white font-semibold text-sm">Adjust Photo</span>
        <button
          onClick={handleConfirm}
          disabled={processing}
          className="text-orange-400 font-semibold text-sm px-2 py-1 disabled:opacity-50"
        >
          {processing ? 'Processing…' : 'Use Photo'}
        </button>
      </div>

      {/* Cropper */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle: { border: '2px solid #f97316' },
          }}
        />
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-sm px-6 py-4 space-y-4">
        {/* Zoom */}
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 h-1 accent-orange-500"
          />
          <svg className="w-5 h-5 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM11 8v6M8 11h6" />
          </svg>
        </div>

        {/* Rotate */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setRotation(r => r - 90)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium active:bg-white/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Rotate Left
          </button>
          <button
            onClick={() => setRotation(r => r + 90)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium active:bg-white/20"
          >
            Rotate Right
            <svg className="w-4 h-4 scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
