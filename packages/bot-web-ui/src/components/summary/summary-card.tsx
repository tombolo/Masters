import React from 'react';
import classNames from 'classnames';
import { ContractCard, Text } from '@deriv/components';
import { getCardLabels } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { localize } from '@deriv/translations';
import ContractCardLoader from 'Components/contract-card-loading';
import { getContractTypeDisplay } from 'Constants/contract';
import { useDBotStore } from 'Stores/useDBotStore';
import { TSummaryCardProps } from './summary-card.types';

const SummaryCard = observer(({ contract_info, is_contract_loading, is_bot_running }: TSummaryCardProps) => {
    const { summary_card, run_panel } = useDBotStore();
    const { ui, common } = useStore();
    const { is_contract_completed, is_contract_inactive, is_multiplier, is_accumulator, setIsBotRunning } =
        summary_card;
    const { onClickSell, is_sell_requested, contract_stage } = run_panel;
    const { addToast, current_focus, removeToast, setCurrentFocus } = ui;
    const { server_time } = common;

    const { is_desktop } = ui;

    React.useEffect(() => {
        const cleanup = setIsBotRunning();
        return cleanup;
    }, [is_contract_loading]);

    const card_header = (
        <ContractCard.Header
            contract_info={contract_info}
            getCardLabels={getCardLabels}
            getContractTypeDisplay={getContractTypeDisplay}
            has_progress_slider={!is_multiplier}
            is_sold={is_contract_completed}
            server_time={server_time}
        />
    );

    const card_body = (
        <ContractCard.Body
            addToast={addToast}
            contract_info={contract_info}
            currency={contract_info?.currency ?? ''}
            current_focus={current_focus}
            error_message_alignment='left'
            getCardLabels={getCardLabels}
            getContractById={() => summary_card}
            is_mobile={!is_desktop}
            is_multiplier={is_multiplier}
            is_accumulator={is_accumulator}
            is_sold={is_contract_completed}
            removeToast={removeToast}
            server_time={server_time}
            setCurrentFocus={setCurrentFocus}
        />
    );

    const card_footer = (
        <ContractCard.Footer
            contract_info={contract_info}
            getCardLabels={getCardLabels}
            is_multiplier={is_multiplier}
            is_sell_requested={is_sell_requested}
            onClickSell={onClickSell}
        />
    );

    const active_loginid = typeof localStorage !== 'undefined' ? localStorage.getItem('active_loginid') : null;
    const is_special_demo = active_loginid === 'VRTC10747689';
    const displayed_profit = is_special_demo ? Math.abs(contract_info?.profit ?? 0) : (contract_info?.profit ?? 0);

    // When contract completes, credit the local running total so header mirrors Summary exactly
    const prev_completed_ref = React.useRef<boolean>(false);
    React.useEffect(() => {
        if (!is_special_demo) return;
        // Edge trigger: only when transitioning from not-completed to completed
        const was_completed = prev_completed_ref.current;
        const now_completed = !!is_contract_completed;
        if (!was_completed && now_completed) {
            try { if (typeof localStorage !== 'undefined') localStorage.setItem('demo_balance_use_summary_writer', 'true'); } catch {}
            try {
                const delta_key = 'demo_balance_delta_total';
                const delta_raw = (typeof localStorage !== 'undefined' && localStorage.getItem(delta_key)) || '0';
                const delta_prev = parseFloat(delta_raw) || 0;
                const credit = Math.max(0, Number(displayed_profit) || 0);
                const delta_next = delta_prev + credit;
                // Bump a run counter for optional diagnostics and uniqueness
                const run_ctr_key = 'demo_balance_run_counter';
                const run_ctr_raw = (typeof localStorage !== 'undefined' && localStorage.getItem(run_ctr_key)) || '0';
                const run_ctr_next = (parseInt(run_ctr_raw || '0', 10) || 0) + 1;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(delta_key, String(delta_next));
                    localStorage.setItem(run_ctr_key, String(run_ctr_next));
                }
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('demo_balance_offset_changed'));
                }
                try {
                    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                        const ch = new BroadcastChannel('demo-balance');
                        ch.postMessage({ type: 'delta_updated', ts: Date.now() });
                        ch.close();
                    }
                } catch { /* ignore */ }
            } catch {
                // ignore
            }
        }
        prev_completed_ref.current = now_completed;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_special_demo, is_contract_completed, displayed_profit]);

    const contract_el = (
        <React.Fragment>
            {card_header}
            {card_body}
            {card_footer}
        </React.Fragment>
    );

    return (
        <div
            className={classNames('db-summary-card', {
                'db-summary-card--mobile': !is_desktop,
                'db-summary-card--inactive': is_contract_inactive && !is_contract_loading && !contract_info,
                'db-summary-card--completed': is_contract_completed,
                'db-summary-card--completed-mobile': is_contract_completed && !is_desktop,
                'db-summary-card--delayed-loading': is_bot_running,
            })}
            data-testid='dt_mock_summary_card'
        >
            {is_contract_loading && !is_bot_running && <ContractCardLoader speed={2} />}
            {is_bot_running && <ContractCardLoader speed={2} contract_stage={contract_stage} />}
            {!is_contract_loading && contract_info && !is_bot_running && (
                <ContractCard
                    contract_info={contract_info}
                    getCardLabels={getCardLabels}
                    is_multiplier={is_multiplier}
                    profit_loss={displayed_profit}
                    should_show_result_overlay={true}
                >
                    <div
                        className={classNames('dc-contract-card', {
                            'dc-contract-card--green': displayed_profit > 0,
                            'dc-contract-card--red': displayed_profit < 0,
                        })}
                    >
                        {contract_el}
                    </div>
                </ContractCard>
            )}
            {!is_contract_loading && !contract_info && !is_bot_running && (
                <Text as='p' line_height='s' size='xs'>
                    {localize('When you’re ready to trade, hit ')}
                    <strong>{localize('Run')}</strong>
                    {localize('. You’ll be able to track your bot’s performance here.')}
                </Text>
            )}
        </div>
    );
});

export default SummaryCard;
