import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';

export const citySelectedValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const lat = control.get('lat')?.value;
  const lng = control.get('lng')?.value;
  return lat != null && lng != null ? null : { citySelected: true };
};

export const arrivalBeforeDepartureValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const arrival = control.get('arrivalDate')?.value;
  const departure = control.get('departureDate')?.value;
  if (!arrival || !departure) return null;
  return new Date(arrival) <= new Date(departure) ? null : { arrivalAfterDeparture: true };
};

export const segmentSequenceValidator: ValidatorFn = (array: AbstractControl): ValidationErrors | null => {
  const formArray = array as FormArray;
  for (let i = 1; i < formArray.length; i++) {
    const previousDeparture = formArray.at(i - 1).get('departureDate')?.value;
    const currentArrival = formArray.at(i).get('arrivalDate')?.value;
    if (!previousDeparture || !currentArrival) continue;
    if (new Date(currentArrival) < new Date(previousDeparture)) {
      return { sequenceBroken: i };
    }
  }
  return null;
};
