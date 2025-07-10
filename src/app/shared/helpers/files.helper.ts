const _fileValid = ['PNG', 'JPG', 'JPEG'];

export const onValidImg = ( extension: string, size: number ): boolean => {

  const sizeMegabytes = size / 4000000;

  let isValidFile = true;

  if ( !_fileValid.includes( extension.toUpperCase() ) ) {
    isValidFile = false;
  }

  if ( sizeMegabytes > 10 ) {
    isValidFile = false;
  }

  return isValidFile;

}
