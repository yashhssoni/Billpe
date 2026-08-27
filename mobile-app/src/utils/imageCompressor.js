import * as ImageManipulator from 'expo-image-manipulator';

export const compressProductImage = async (uri) => {
  if (!uri) return null;
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], 
      { 
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
    return manipResult.uri;
  } catch (error) {
    console.log('Image compression error:', error);
    return uri; 
  }
};