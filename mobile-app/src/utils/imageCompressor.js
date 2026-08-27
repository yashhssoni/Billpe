import * as ImageManipulator from 'expo-image-manipulator';

export const compressProductImage = async (uri) => {
  if (!uri) return null;
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // 800px width par crystal-clear quality rehti hai
      { 
        compress: 0.7, // 70% quality, size drops from 4MB to ~70KB
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
    return manipResult.uri;
  } catch (error) {
    console.log('Image compression error:', error);
    return uri; // Error aane par original URI use hoga
  }
};