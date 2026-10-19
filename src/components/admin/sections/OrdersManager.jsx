import React from 'react'
import { Bell, PackageCheck } from 'lucide-react'
import AdminPanel from '../AdminPanel'
import formatCurrency from '../../../utils/formatCurrency'

export default function OrdersManager({
  pendingOrders = [],
  loadingOrders = false,
  onOrderStatus,
  onReminder,
  renderSkeletonRows,
}) {
  return (
    <AdminPanel
      title="Order Fulfillment"
      tagLabel="ORDERS"
      tagClass="tag-orders"
      className="tour-orders-panel"
    >
      <div id="adminOrders" className="tour-orders-actions">
        {loadingOrders ? (
          renderSkeletonRows(3, 'orders')
        ) : pendingOrders.length ? (
          pendingOrders.map((item) => (
            <div className="b-row" key={item.id}>
              <div className="b-top">
                <span className="b-name">
                  {item.name}{' '}
                  <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>
                    #{item.id}
                  </span>
                </span>
                <span
                  className={`status-chip ${
                    item.status === 'pending'
                      ? 'sc-pending'
                      : 'sc-fulfilled'
                  }`}
                >
                  {item.status.toUpperCase()}
                </span>
              </div>
              <div className="b-sub">
                {item.items} · {formatCurrency(item.total)}
              </div>
              {item.status === 'pending' ? (
                <div className="b-actions">
                  <button
                    className="confirm-btn cb-fulfill"
                    type="button"
                    onClick={() => onOrderStatus(item.id, 'fulfilled')}
                  >
                    <PackageCheck size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Mark Fulfilled
                  </button>
                  <button
                    className="confirm-btn"
                    type="button"
                    onClick={() => onReminder(item, 'order')}
                  >
                    <Bell size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Remind
                  </button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>
            No pending actions.
          </p>
        )}
      </div>
    </AdminPanel>
  )
}
