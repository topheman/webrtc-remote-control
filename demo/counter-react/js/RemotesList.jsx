import React from "react";
import PropTypes from "prop-types";

import "../../shared/js/components/remotes-list";

export default function RemotesList({ data }) {
  return <remotes-list data={JSON.stringify(data)}></remotes-list>;
}

RemotesList.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.exact({
      counter: PropTypes.number,
      peerId: PropTypes.string,
      name: PropTypes.string,
    })
  ),
};
