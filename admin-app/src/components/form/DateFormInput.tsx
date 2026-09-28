import type { FormInputProps } from '@/types/component-props'
import { FormControl, FormGroup, FormLabel } from 'react-bootstrap'
import Feedback from 'react-bootstrap/esm/Feedback'
import type { DateTimePickerProps } from 'react-flatpickr'
import DatePicker from 'react-flatpickr'
import { Controller, type FieldPath, type FieldValues, type PathValue } from 'react-hook-form'
const DateFormInput = <TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({
  name,
  containerClassName: containerClass,
  control,
  id,
  label,
  noValidate,
  labelClassName: labelClass,
  ...other
}: FormInputProps<TFieldValues> & DateTimePickerProps) => {
  return (
    <Controller<TFieldValues, TName>
      name={name as TName}
      defaultValue={'' as PathValue<TFieldValues, TName>}
      control={control}
      render={({ field, fieldState }) => (
        <FormGroup className={containerClass}>
          {label &&
            (typeof label === 'string' ? (
              <FormLabel htmlFor={id ?? name} className={labelClass}>
                {label}
              </FormLabel>
            ) : (
              <>{label}</>
            ))}
          {/* @ts-ignore */}
          <DatePicker
            className="form-control"
            //  @ts-ignore 
            onChange={([date]) => {
              field.onChange(date)
            }}
            id={id ?? name}
            {...other}
            {...field}
          />
          {!noValidate && fieldState.error?.message && <Feedback type="invalid">{fieldState.error?.message}</Feedback>}
        </FormGroup>
      )}
    />
  )
}

export default DateFormInput
