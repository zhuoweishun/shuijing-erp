import { useState, useRef } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';

interface PhotoCaptureProps {
  onPhotoCapture: (photos: string[]) => void;
  maxPhotos?: number;
  existingPhotos?: string[];
}

export default function PhotoCapture({ onPhotoCapture, maxPhotos = 5, existingPhotos = [] }: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPhotos: string[] = [];
    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = Math.min(files.length, remainingSlots);

    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          newPhotos.push(result);
          
          if (newPhotos.length === filesToProcess) {
            const updatedPhotos = [...photos, ...newPhotos];
            setPhotos(updatedPhotos);
            onPhotoCapture(updatedPhotos);
          }
        };
        reader.readAsDataURL(file);
      }
    }

    // 重置input值，允许重复选择同一文件
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    onPhotoCapture(updatedPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-4">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* 隐藏的相机输入 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 拍照按钮 */}
      {canAddMore && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCameraCapture}
            className="py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center space-x-2 transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span>拍照</span>
          </button>
          
          <button
            onClick={handleFileUpload}
            className="py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center space-x-2 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>选择文件</span>
          </button>
        </div>
      )}

      {/* 照片预览 */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              已添加 {photos.length}/{maxPhotos} 张照片
            </span>
            {!canAddMore && (
              <span className="text-xs text-orange-500">已达到最大数量</span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`照片 ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}