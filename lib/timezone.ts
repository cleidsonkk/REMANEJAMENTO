const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

function parseDateParts(value: string) {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error("Data invalida para conversao de timezone.");
  }

  return { year, month, day };
}

function getOffsetInMilliseconds(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const formattedParts = formatter.formatToParts(date);
  const values = {
    year: Number.parseInt(formattedParts.find((part) => part.type === "year")?.value ?? "", 10),
    month: Number.parseInt(formattedParts.find((part) => part.type === "month")?.value ?? "", 10),
    day: Number.parseInt(formattedParts.find((part) => part.type === "day")?.value ?? "", 10),
    hour: Number.parseInt(formattedParts.find((part) => part.type === "hour")?.value ?? "", 10),
    minute: Number.parseInt(formattedParts.find((part) => part.type === "minute")?.value ?? "", 10),
    second: Number.parseInt(formattedParts.find((part) => part.type === "second")?.value ?? "", 10),
  };

  const utcTimestamp = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  const referenceTimestamp = date.getTime() - date.getMilliseconds();

  return utcTimestamp - referenceTimestamp;
}

function zonedDateTimeToUtc(args: {
  date: string;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  timeZone?: string;
}) {
  const { year, month, day } = parseDateParts(args.date);
  const naiveUtcDate = new Date(
    Date.UTC(year, month - 1, day, args.hour, args.minute, args.second, args.millisecond),
  );
  const offset = getOffsetInMilliseconds(naiveUtcDate, args.timeZone);

  return new Date(naiveUtcDate.getTime() - offset);
}

export function startOfDayInTimeZone(date: string, timeZone = DEFAULT_TIME_ZONE) {
  return zonedDateTimeToUtc({
    date,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone,
  });
}

export function endOfDayInTimeZone(date: string, timeZone = DEFAULT_TIME_ZONE) {
  return zonedDateTimeToUtc({
    date,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
    timeZone,
  });
}
