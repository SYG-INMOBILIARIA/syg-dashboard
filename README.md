# SygDashboard

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.2.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Config firebase (storage) cors
1. Auth and set config
```bash
# auth google console
 gcloud auth login

#Set config to firebase
 gcloud config set project your-project-id
```
2. Create file cors.json
```json
[
  {
    "origin": ["*"],  // or specify your frontend domain, e.g., "https://your-angular-app.com"
    "responseHeader": ["Content-Type"],
    "method": ["GET", "OPTIONS"],
    "maxAgeSeconds": 3600
  }
]

```
3. Apply cors configuration to firebase storage
```bash
gsutil cors set cors.json gs://your-firebase-storage-bucket-name
```

