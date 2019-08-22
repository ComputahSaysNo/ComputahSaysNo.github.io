function initGraph(canvas, sim) {
    var ctx = document.getElementById(canvas).getContext('2d');
    var c = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            },
            responsive: false
        }
    });

    var species = Array.from(sim.speciesInvolved);
    var colours = ['rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)'];

    for (var i = 0; i < species.length; i++) {
        c.data.datasets[i] = {
            label: species[i].name,
            fill: false,
            borderColor: colours[i],
            backgroundColor: colours[i],
            pointRadius: 0
        };
    }

    var count = 0;

    animateGraph();

    function animateGraph() {
        count++;
        if (count % 2 === 0) {
            var comp = Object.values(sim.getComposition());
            for (var i = 0; i < comp.length; i++) {
                c.data.datasets[i].data.push(comp[i]);
            }
            c.data.labels = [...Array(c.data.datasets[0].data.length).keys()];
        }
        c.update();
        requestAnimationFrame(animateGraph);
    }
}


