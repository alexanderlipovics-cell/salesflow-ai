CREATE OR REPLACE FUNCTION increment_ai_usage(
    p_user_id UUID,
    p_date DATE,
    p_model TEXT,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_cost DECIMAL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_usage (user_id, date, model, input_tokens, output_tokens, total_tokens, estimated_cost, request_count)
    VALUES (p_user_id, p_date, p_model, p_input_tokens, p_output_tokens, p_input_tokens + p_output_tokens, p_cost, 1)
    ON CONFLICT (user_id, date, model) DO UPDATE SET
        input_tokens = ai_usage.input_tokens + p_input_tokens,
        output_tokens = ai_usage.output_tokens + p_output_tokens,
        total_tokens = ai_usage.total_tokens + p_input_tokens + p_output_tokens,
        estimated_cost = ai_usage.estimated_cost + p_cost,
        request_count = ai_usage.request_count + 1;
END;
$$ LANGUAGE plpgsql;

