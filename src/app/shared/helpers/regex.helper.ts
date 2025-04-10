
export const passwordPatt = new RegExp(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/);


export const textUbigeoName = new RegExp(/^[a-zñ\s]{0,200}$/i);
export const fullTextPatt = new RegExp(/^[a-záéíóúüñ\-\'\.\,\#\s\d]{0,400}$/i);
export const descriptionPatt = new RegExp(/^[a-záéíóúüñ\-\'\.\,\s\d\/\<\>]{0,650}$/i);

export const fullTextWithoutSpacePatt = new RegExp(/^[a-záéíóúüñ]{0,200}$/i);
export const urlMenuPatt = new RegExp(/^[a-z0-9\/\-\:]{0,200}$/);
export const fullTextNumberPatt = new RegExp(/^[a-záéíóúüñ\d\.\,\s]{0,200}$/i);
export const materialIconPatt = new RegExp(/^[a-z0-9\_\-]{0,200}$/i);
export const numberPatt = new RegExp(/^[0-9]{0,20}$/);
export const timePatt = new RegExp(/^\d{2,2}\:\d{2,2}$/);

export const alphaNumericPatt = new RegExp(/^[a-z\-\s\d]{0,200}$/i);

export const decimalPatt = new RegExp(/^\d+(?:\.\d{1,2})?$/);

export const urlPatt = /^(https?|ftp):\/\/(([a-z\d]([a-z\d-]*[a-z\d])?\.)+[a-z]{2,}|localhost)(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?$/i;

export const translatePatt = new RegExp(/^[a-z\.]{0,200}$/i);
export const classPatt = new RegExp(/^[a-z0-9\-\_\.]{0,200}$/i);

export const timeZonePatt = new RegExp(/^[a-z\/\_]{0,50}$/i);

export const isoThreePatt = new RegExp(/^[a-z]{2,3}$/i);
export const ubigeoCodePatt = new RegExp(/^[0-9]{2,3}$/i);
export const numberDocumentPatt = new RegExp(/^[a-z\d]{0,15}$/i);
// export const isoThreePatt = new RegExp(/^[a-zA-Z]{2,3}$/);

export const codePatt = new RegExp(/^[a-z\_]{2,20}$/i);

export const symbolPatt = new RegExp(/^[a-z\€\$\/\¥\£]{1,5}$/i);

export const prefixPhonePatt = new RegExp(/^[\+\d]{2,6}$/);

export const phonePatt = new RegExp(/^[\(\)\+\d\s]{0,20}$/);

export const datePatt = new RegExp(/^[\d]{4,4}\-[\d]{2,2}\-[\d]{2,2}$/);

export const latlngPatt = new RegExp(/^(\+|-)?(?:90(?:(?:\.0{1,6})?)|(?:[0-9]|[1-8][0-9])(?:(?:\.[0-9]{1,20})?))$/);

export const emailPatt = new RegExp(/^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i);

