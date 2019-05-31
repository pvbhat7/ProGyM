package com.progym.pvbhat7.progymfinal;

import android.content.Intent;
import android.graphics.drawable.Drawable;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.util.HashMap;
import java.util.Random;

import static android.view.View.GONE;

public class Coupons extends AppCompatActivity {
    private static final int CODE_POST_REQUEST = 1025;
    Button gen_code;
    TextView coupon;
    String flag="",COUPON_="";
    private ProgressBar progressBar;
    public Session session;
    HashMap<String, String> params=null;
    private FirebaseAuth auth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_coupons);
        auth = FirebaseAuth.getInstance();
        final FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();


        COUPON_= Coupons.generateCouponCode();

        gen_code= (Button)findViewById(R.id.generate_coupon);
        coupon = (TextView)findViewById(R.id.coupon_code);
        session = new Session(getApplicationContext());

        flag=session.getcouponFlag();
        if(flag.equalsIgnoreCase("true"))
        {
            coupon.setText(session.getcoupon());
            gen_code.setBackgroundResource(R.drawable.bbttnn);
        }




            gen_code.setOnClickListener(new View.OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if(flag.equalsIgnoreCase("false"))
                    {

                        coupon.setText(COUPON_);
                        gen_code.setBackgroundResource(R.drawable.bbttnn);
                        session.setCoupon(COUPON_);
                        session.setcouponFlag("true");
                    }
                    else if(flag.equalsIgnoreCase("true"))
                    {

                        coupon.setText(session.getcoupon());
                        gen_code.setBackgroundResource(R.drawable.bbttnn);
                    }

                }
            });

        if(!session.getcoupon().equalsIgnoreCase(""))
        {
            params = new HashMap<>();
            params.put("coupon", session.getcoupon());
            params.put("email",user.getEmail());
            PerformNetworkRequest request = new PerformNetworkRequest(Api.URL_UPLOAD_COUPON_DETAILS, params, CODE_POST_REQUEST);
            request.execute();

        }

    }
    class PerformNetworkRequest extends AsyncTask<Void, Void, String> {
        String url;
        HashMap<String, String> params;
        int requestCode;

        PerformNetworkRequest(String url, HashMap<String, String> params, int requestCode) {
            this.url = url;
            this.params = params;
            this.requestCode = requestCode;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
           // progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        protected void onPostExecute(String s) {
            super.onPostExecute(s);
            //progressBar.setVisibility(GONE);
            /*try {
                JSONObject object = new JSONObject(s);
                if (!object.getBoolean("error")) {
                    Toast.makeText(getApplicationContext(), object.getString("message"), Toast.LENGTH_SHORT).show();
                    refreshHeroList(object.getJSONArray("heroes"));
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }*/
            //startActivity(new Intent(SignupActivity.this, LoginActivity.class));
        }

        @Override
        protected String doInBackground(Void... voids) {
            RequestHandler requestHandler = new RequestHandler();

            if (requestCode == CODE_POST_REQUEST)
                return requestHandler.sendPostRequest(url, params);


            /*if (requestCode == CODE_GET_REQUEST)
                return requestHandler.sendGetRequest(url);*/

            return null;
        }
    }

    private static String generateCouponCode() {
        String coupon="";
        String arr[]={"J45FE","PVB07","PSMP7","K3SL8","YU0L4","G9KE6","MK3LL","LLD5P","K3ER9","Z8WQP","K4MF8","D4RG7","B7DF2","S0DF8","B4BFT","M1DL4","L3RP5","D9OPT","V9DQ4","F7EE4"};
        Random generator = new Random();
        int i = generator.nextInt(19) + 1;

        return arr[i];
    }
    @Override
    protected void onResume() {
        super.onResume();
       // progressBar.setVisibility(View.GONE);
    }
}
