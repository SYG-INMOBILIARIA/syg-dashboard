const _fileValid = ['PNG', 'JPG', 'JPEG', 'PDF'];

export const onValidImg = ( extension: string, size: number ): boolean => {

  const sizeMegabytes = size / 5000000;

  let isValidFile = true;

  if ( !_fileValid.includes( extension.toUpperCase() ) ) {
    isValidFile = false;
  }

  if ( sizeMegabytes > 10 ) {
    isValidFile = false;
  }

  return isValidFile;

}
