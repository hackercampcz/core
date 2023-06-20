function getTags(year, paid, invoiced, isConfirmed, isVolunteer, isStaff) {
  function tag() {
    if (isStaff) return "staff";
    if (isVolunteer) return "volunteer";
    if (paid) return "paid";
    if (invoiced) return "invoiced";
    if (isConfirmed) return "confirmed";
    return "waitingList";
  }
  return [year, tag()];
}

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
    approved,
    ...rest
  }) => {
    const isVolunteer = ticketType === "volunteer";
    const isStaff = ticketType === "staff";
    // TODO: Auto-approve +1 referrals after 1st May
    const isConfirmed = !firstTime || approved || referral;
    return Object.assign(rest, {
      objectID: `${rest.year}-${rest.email}`,
      name: `${firstName} ${lastName}`,
      createdAt: new Date(timestamp).getTime(),
      _tags: getTags(
        rest.year.toString(),
        paid,
        invoiced,
        isConfirmed,
        isVolunteer,
        isStaff
      ),
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
