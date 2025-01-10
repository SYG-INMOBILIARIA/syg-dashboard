const _fileValid = ['PNG', 'JPG', 'JPEG'];

export const onValidImg = ( extension: string, size: number ): boolean => {

  const sizeMegabytes = size / 1000000;

  let isValidFile = true;

  if ( !_fileValid.includes( extension.toUpperCase() ) ) {
    isValidFile = false;
  }

  if ( sizeMegabytes > 6 ) {
    isValidFile = false;
  }

  return isValidFile;

}
