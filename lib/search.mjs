export function getRegistrationProjection(crewReferrals) {
  return ({
    firstName,
    lastName,
    timestamp,
    invoiced,
    paid,
    firstTime,
    referral,
    ticketType,
    ...rest
  }) => {
    const isVolunteer = ticketType === "volunteer";
    return Object.assign(rest, {
      objectID: `${rest.year}-${rest.email}`,
      name: `${firstName} ${lastName}`,
      createdAt: new Date(timestamp).getTime(),
      _tags: [
        rest.year.toString(),
        (!invoiced && !firstTime) || crewReferrals.has(referral)
          ? "confirmed"
          : null,
        !isVolunteer && invoiced && !paid ? "invoiced" : null,
        !isVolunteer && paid ? "paid" : null,
        !isVolunteer && firstTime && !invoiced && !crewReferrals.has(referral)
          ? "waitingList"
          : null,
        isVolunteer ? "volunteer" : null,
      ].filter(Boolean),
    });
  };
}

export function getAttendeesProjection() {
  return ({ paid, housing, travel, ticketType, ...rest }) =>
    Object.assign(rest, {
      objectID: `${rest.year}-${rest.slackID}`,
      createdAt: new Date(paid).getTime(),
      _tags: [rest.year.toString(), travel, housing, ticketType].filter(
        Boolean
      ),
    });
}
