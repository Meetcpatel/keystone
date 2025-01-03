/** @jsxRuntime classic */
/** @jsx jsx */

import { Fragment, useCallback, useEffect, useRef } from 'react'
import { jsx, Stack } from '@keystone-ui/core'
import {
  deserializeDate,
  formatDate,
  formatDateType,
  dateFormatPlaceholder,
} from '../utils/dateFormatters'
import { type DateType } from '../types'
import { Calendar } from './Calendar'
import { InputButton } from './components/InputButton'
import { FieldLabel } from '../FieldLabel'

export type DateInputValue = string | undefined

export type DatePickerProps = {
  onUpdate: (value: DateType) => void
  onClear: () => void
  onBlur?: () => void
  value: DateType
  label?: string
}

export function useEventCallback<Func extends (...args: any) => any>(callback: Func): Func {
  const callbackRef = useRef(callback)
  const cb = useCallback((...args: any[]) => {
    return callbackRef.current(...args)
  }, [])
  useEffect(() => {
    callbackRef.current = callback
  })
  return cb as any
}

export const BlockDatePicker = ({
  value,
  onUpdate,
  onClear,
  onBlur: _onBlur,
  label,
  ...props
}: DatePickerProps) => {
  const onBlur = useEventCallback(() => {
    _onBlur?.()
  })

  const handleDayClick = useCallback(
    (day: Date) => {
      onUpdate(formatDateType(day))
    },
    [onUpdate]
  )

  const selectedDay = deserializeDate(value)
  const formattedDate: DateInputValue = value ? formatDate(selectedDay) : undefined

  return (
    <Stack gap="small">
      {label && <FieldLabel>{label}</FieldLabel>}
      <Fragment>
        <InputButton
          aria-label={'Choose date' + (formattedDate ? `, selected date is ${formattedDate}` : '')}
          onClear={
            value
              ? () => {
                onClear()
                onBlur?.()
              }
              : undefined
          }
          {...props}
          style={{ minWidth: 200 }}
        >
          {formattedDate || dateFormatPlaceholder}
        </InputButton>
        <Calendar onDayClick={handleDayClick} selected={selectedDay} />
      </Fragment>
    </Stack>
  )
}